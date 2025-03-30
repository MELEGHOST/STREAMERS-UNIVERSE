'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './followers.module.css';
import { DataStorage } from '../utils/dataStorage';
import { createBrowserClient } from '@supabase/ssr';

export default function Followers() {
  const router = useRouter();
  const [sessionUserId, setSessionUserId] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [roles, setRoles] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalFollowers, setTotalFollowers] = useState(0);
  const [profileData, setProfileData] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const supabase = useMemo(() => 
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ), 
  []);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          console.error('FollowersPage: Пользователь не авторизован, редирект на /auth');
          router.push('/auth?reason=unauthenticated');
          return;
        }
        console.log('FollowersPage: Сессия Supabase найдена.');
        
        const twitchUserId = session.user?.user_metadata?.provider_id;
        if (!twitchUserId) {
            console.error('FollowersPage: Не удалось получить provider_id из сессии Supabase');
            setError('Не удалось получить ваш Twitch ID из сессии. Попробуйте перезайти.');
            setLoading(false);
            return;
        }
        setSessionUserId(twitchUserId);
        console.log('FollowersPage: Twitch ID пользователя:', twitchUserId);

        await loadFollowers(twitchUserId, null);

      } catch (error) {
        console.error('FollowersPage: Ошибка при загрузке начальных данных:', error);
        setError('Не удалось загрузить данные. Пожалуйста, попробуйте позже.');
      } finally {
         setLoading(false);
      }
    };
    
    loadInitialData();
  }, [router, supabase]);
  
  const loadFollowers = useCallback(async (userId, cursor) => {
    if (!userId) return;
    console.log(`FollowersPage: Загрузка фолловеров для ${userId}, курсор: ${cursor}`);
    
    if (cursor) { 
      setLoadingMore(true); 
    } else {
      setLoading(true); 
      setFollowers([]);
      setNextCursor(null);
    }
    setError(null);
    
    try {
      const apiUrl = new URL(`/api/twitch/user-followers`, window.location.origin);
      apiUrl.searchParams.append('userId', userId);
      apiUrl.searchParams.append('limit', '100');
      if (cursor) {
        apiUrl.searchParams.append('after', cursor);
      }

      const response = await fetch(apiUrl.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
      });
      
      if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('FollowersPage: Ошибка API при получении фолловеров:', response.status, errorData);
          throw new Error(errorData.error || `Ошибка ${response.status} при загрузке фолловеров`);
      }
      
      const followersData = await response.json();
      
      if (followersData.error) {
          console.error('FollowersPage: Ошибка в ответе API:', followersData.error);
          throw new Error(followersData.error);
      }
      
      console.log('FollowersPage: Получены данные о фолловерах:', {
        total: followersData.total || 0,
        count: followersData.followers?.length || 0,
        cursor: followersData.pagination?.cursor
      });
      
      if (followersData && followersData.followers) {
        const newFollowers = followersData.followers.map(f => ({ 
            ...f, 
            profileImageUrl: f.profileImageUrl || '/images/default-avatar.png' 
        }));
        
        setFollowers(prev => cursor ? [...prev, ...newFollowers] : newFollowers);
        setTotalFollowers(followersData.total || 0);
        setNextCursor(followersData.pagination?.cursor);

      } else {
        if (!cursor) {
          setFollowers([]);
          setTotalFollowers(0);
        }
        setNextCursor(null);
      }
      
    } catch (error) {
      console.error('FollowersPage: Ошибка при загрузке фолловеров:', error);
      setError(error.message || 'Не удалось загрузить данные о фолловерах.');
      if (!cursor) {
          setFollowers([]);
          setTotalFollowers(0);
      }
    } finally {
        if (cursor) { setLoadingMore(false); } else { setLoading(false); }
    }
  }, [supabase]);
  
  const saveRoles = async (newRoles) => {
    try {
      setRoles(newRoles);
      await DataStorage.saveData('follower_roles', newRoles);
    } catch (error) {
      console.error('Ошибка при сохранении ролей:', error);
    }
  };

  const handleAssignRole = (followerId, role) => {
    const updatedRoles = { ...roles, [followerId]: role };
    setRoles(updatedRoles);
    saveRoles(updatedRoles);
    console.log(`Назначена роль ${role} для фолловера ${followerId}`);
  };

  const handleRetry = () => {
    if (sessionUserId) {
      loadFollowers(sessionUserId, null);
    }
  };

  const handleLoadMore = () => {
    if (sessionUserId && nextCursor && !loadingMore) {
      loadFollowers(sessionUserId, nextCursor);
    }
  };

  if (loading && followers.length === 0) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Загрузка фолловеров...</p>
      </div>
    );
  }

  if (error && followers.length === 0) {
    return (
      <div className={styles.errorContainer}>
        <h1>Ошибка при загрузке фолловеров</h1>
        <p className={styles.errorMessage}>{error}</p>
        <button className={styles.button} onClick={handleRetry}>
          Попробовать снова
        </button>
        <button className={styles.button} onClick={() => router.push('/menu')}>
          Вернуться в меню
        </button>
      </div>
    );
  }

  return (
    <div className={styles.followersPage}>
      <h1 className={styles.title}>Фолловеры Twitch</h1>
      <p className={styles.subtitle}>Список пользователей, подписанных на ваш канал Twitch. {totalFollowers > 0 && <span>Всего: <strong>{totalFollowers.toLocaleString('ru-RU')}</strong></span>}</p>
      
      {error && followers.length > 0 && (
          <div className={styles.errorInline}>Ошибка при загрузке дополнительных данных: {error}</div>
      )}
      
      {followers.length > 0 ? (
        <div className={styles.followersContainer}>
          <div className={styles.infoBar}>
            <div className={styles.statsInfo}>
              <p>Отображаются фолловеры Twitch с канала: <strong>{profileData?.displayName || profileData?.login || sessionUserId}</strong></p>
            </div>
            <div className={styles.filterOptions}>
              <select 
                className={styles.filterSelect}
                onChange={() => {
                  // TODO: добавить фильтрацию
                }}
              >
                <option value="all">Все фолловеры</option>
                <option value="registered">Только зарегистрированные в SU</option>
                <option value="notRegistered">Только незарегистрированные в SU</option>
              </select>
            </div>
          </div>
          
          <div className={styles.followersGrid}>
            {followers.map(follower => (
              <div key={follower.id} className={styles.followerCard}>
                <div className={styles.followerAvatar}>
                  <Image 
                    src={follower.profileImageUrl || '/images/default-avatar.png'} 
                    alt={follower.name}
                    width={50}
                    height={50}
                    onError={(event) => { event.target.src = '/images/default-avatar.png'; }}
                    className={styles.avatarImage}
                    priority
                  />
                  {follower.isRegisteredOnSU && (
                    <div className={styles.registeredBadge} title="Пользователь зарегистрирован на Streamers Universe">SU</div>
                  )}
                </div>
                <div className={styles.followerInfo}>
                  <div className={styles.followerName}>{follower.name}</div>
                  {follower.login && follower.login !== follower.name && (
                    <div className={styles.followerLogin}>@{follower.login}</div>
                  )}
                  <div className={styles.followerDate}>
                    Подписан с {new Date(follower.followedAt).toLocaleDateString('ru-RU')}
                  </div>
                  <div className={styles.followerStatus}>
                    {follower.isRegisteredOnSU ? (
                      <span className={styles.registeredStatus}>
                        Зарегистрирован на SU {follower.suUserType === 'streamer' ? '• Стример' : '• Зритель'}
                      </span>
                    ) : (
                      <span className={styles.notRegisteredStatus}>Не зарегистрирован на SU</span>
                    )}
                    
                    {follower.broadcasterType && (
                      <span className={styles.broadcasterType}>
                        {follower.broadcasterType === 'partner' ? '• Партнер Twitch' : 
                         follower.broadcasterType === 'affiliate' ? '• Аффилейт Twitch' : ''}
                      </span>
                    )}
                  </div>
                  <div className={styles.roleSelector}>
                    <select 
                      value={roles[follower.id] || ''} 
                      onChange={(e) => handleAssignRole(follower.id, e.target.value)}
                      disabled={!follower.isRegisteredOnSU}
                    >
                      <option value="">Роль не назначена</option>
                      <option value="moderator">Модератор</option>
                      <option value="vip">VIP</option>
                      <option value="regular">Постоянный зритель</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {nextCursor && (
            <div className={styles.loadMoreContainer}>
              {!loadingMore ? (
                <button onClick={handleLoadMore} className={styles.loadMoreButton}>
                  Загрузить еще
                </button>
              ) : (
                <div className={styles.smallLoader}>Загрузка...</div>
              )}
            </div>
          )}
          {!nextCursor && followers.length > 0 && (
              <p className={styles.noMoreFollowers}>Больше фолловеров нет</p>
          )}
        </div>
      ) : !loading && (
          <div className={styles.noFollowers}>У вас пока нет фолловеров.</div>
      )}
      
      <div className={styles.navigationLinks}>
        <button onClick={() => router.push('/menu')} className={styles.menuButton}>
          Вернуться в меню
        </button>
        <button onClick={() => router.push('/followers/su')} className={styles.suButton}>
          Показать последователей Streamers Universe
        </button>
      </div>
      
      <button className={styles.backButton} onClick={() => router.back()}>
          Назад
       </button>
    </div>
  );
} 