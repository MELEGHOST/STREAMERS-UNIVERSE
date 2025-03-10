'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../followers.module.css';
import { getUserData } from '../../utils/twitchAPI';
import { DataStorage } from '../../utils/dataStorage';

export default function FollowersSU() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalFollowers, setTotalFollowers] = useState(0);
  const [profileData, setProfileData] = useState(null);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    const loadData = async () => {
      try {
        // Проверяем авторизацию
        if (!DataStorage.isAuthenticated()) {
          console.error('Пользователь не авторизован, перенаправление на страницу логина');
          router.push('/login');
          return;
        }
        
        setIsAuthenticated(true);
        
        // Получаем данные пользователя из нового хранилища
        const userData = await getUserData();
        
        if (!userData || !userData.id) {
          console.error('Данные пользователя отсутствуют, перенаправление на страницу логина');
          router.push('/login');
          return;
        }
        
        setUserId(userData.id);
        setProfileData(userData);
        
        // Загружаем данные о последователях на Streamers Universe
        await loadSUFollowers(userData.id);
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        setError('Не удалось загрузить данные. Пожалуйста, попробуйте позже.');
        setLoading(false);
      }
    };
    
    loadData();
  }, [router]);
  
  // Загрузка последователей Streamers Universe
  const loadSUFollowers = async (userId) => {
    try {
      setLoading(true);
      
      // Делаем запрос к API для получения последователей Streamers Universe
      try {
        const response = await fetch(`/api/su/followers?userId=${userId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          console.error('Ошибка при получении последователей SU:', response.status);
          const errorData = await response.json();
          throw new Error(errorData.error || 'Не удалось получить данные о последователях');
        }
        
        const followersData = await response.json();
        
        if (followersData.followers && followersData.followers.length > 0) {
          // Проверяем регистрацию на Twitch для каждого последователя
          try {
            const twitchFollowersResponse = await fetch(`/api/twitch/check-followers`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                userId: userId,
                suFollowerIds: followersData.followers.map(f => f.twitchId).filter(id => id)
              })
            });
            
            let twitchFollowerIds = [];
            
            if (twitchFollowersResponse.ok) {
              const twitchData = await twitchFollowersResponse.json();
              twitchFollowerIds = twitchData.followerIds || [];
            }
            
            // Обновляем информацию о фолловерах
            const updatedFollowers = followersData.followers.map(follower => ({
              ...follower,
              isTwitchFollower: follower.twitchId && twitchFollowerIds.includes(follower.twitchId)
            }));
            
            setFollowers(updatedFollowers);
            setTotalFollowers(updatedFollowers.length);
          } catch (twitchError) {
            console.error('Ошибка при проверке Twitch фолловеров:', twitchError);
            // Если не удалось проверить Twitch, просто отображаем последователей SU
            setFollowers(followersData.followers);
            setTotalFollowers(followersData.followers.length);
          }
        } else {
          setFollowers([]);
          setTotalFollowers(0);
        }
      } catch (apiError) {
        console.error('Ошибка при запросе к API:', apiError);
        // В случае ошибки показываем пустой список
        setFollowers([]);
        setTotalFollowers(0);
        setError('Не удалось загрузить данные о последователях. Пожалуйста, попробуйте позже.');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Ошибка при загрузке последователей SU:', error);
      setError('Не удалось загрузить данные о последователях. Пожалуйста, попробуйте позже.');
      setFollowers([]);
      setTotalFollowers(0);
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    setLoading(true);
    setError(null);
    if (userId) {
      await loadSUFollowers(userId);
    } else {
      const userData = await getUserData();
      if (userData && userData.id) {
        setUserId(userData.id);
        await loadSUFollowers(userData.id);
      } else {
        setError('Не удалось получить идентификатор пользователя.');
        setLoading(false);
      }
    }
  };
  
  // Обновление роли последователя
  const handleUpdateRole = async (followerId, newRole) => {
    try {
      // Оптимистичное обновление UI
      const updatedFollowers = followers.map(f => 
        f.id === followerId ? {...f, role: newRole} : f
      );
      setFollowers(updatedFollowers);
      
      // Отправляем запрос на сервер
      const response = await fetch('/api/su/update-follower-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          followerId,
          assignerId: userId,
          role: newRole
        })
      });
      
      if (!response.ok) {
        console.error('Ошибка при обновлении роли:', response.status);
        // Если произошла ошибка, откатываем изменения
        await loadSUFollowers(userId);
      }
    } catch (error) {
      console.error('Ошибка при обновлении роли:', error);
      // В случае ошибки загружаем актуальные данные
      await loadSUFollowers(userId);
    }
  };

  // Фильтрация последователей по выбранному критерию
  const filteredFollowers = followers.filter(follower => {
    if (filterType === 'all') return true;
    if (filterType === 'twitch') return follower.isTwitchFollower;
    if (filterType === 'onlySu') return !follower.isTwitchFollower;
    return true;
  });

  return (
    <div className={styles.followersPage}>
      <h1 className={styles.title}>Последователи Streamers Universe</h1>
      <p className={styles.subtitle}>Пользователи, которые подписались на вас в Streamers Universe. {totalFollowers > 0 && <span>Всего: <strong>{totalFollowers}</strong></span>}</p>
      
      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Загрузка последователей...</p>
        </div>
      ) : error ? (
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={handleRetry} className={styles.button}>Повторить</button>
        </div>
      ) : followers.length > 0 ? (
        <div className={styles.followersContainer}>
          <div className={styles.infoBar}>
            <div className={styles.statsInfo}>
              <p>Пользователи, подписавшиеся на вас в Streamers Universe</p>
            </div>
            <div className={styles.filterOptions}>
              <select 
                className={styles.filterSelect}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">Все последователи</option>
                <option value="twitch">Также подписаны на Twitch</option>
                <option value="onlySu">Только на Streamers Universe</option>
              </select>
            </div>
          </div>
          
          <div className={styles.followersGrid}>
            {filteredFollowers.map(follower => (
              <div key={follower.id} className={styles.followerCard}>
                <div className={styles.followerAvatar}>
                  <img 
                    src={follower.profileImageUrl || '/images/default-avatar.png'} 
                    alt={follower.name} 
                    onError={(e) => {e.target.src = '/images/default-avatar.png'}}
                  />
                  {follower.isTwitchFollower && (
                    <div className={styles.registeredBadge} title="Также подписан на вас в Twitch">TW</div>
                  )}
                </div>
                <div className={styles.followerInfo}>
                  <div className={styles.followerName}>{follower.name}</div>
                  {follower.username && (
                    <div className={styles.followerLogin}>@{follower.username}</div>
                  )}
                  <div className={styles.followerDate}>
                    Подписан с {new Date(follower.followedAt).toLocaleDateString('ru-RU')}
                  </div>
                  
                  <div className={styles.followerStatus}>
                    {follower.isTwitchFollower ? (
                      <span className={styles.registeredStatus}>Подписан на Twitch</span>
                    ) : (
                      <span className={styles.notRegisteredStatus}>Только SU</span>
                    )}
                    
                    {follower.userType === 'streamer' && (
                      <span className={styles.broadcasterType}>• Стример</span>
                    )}
                  </div>
                  
                  <div className={styles.roleSelector}>
                    <select 
                      value={follower.role || ''} 
                      onChange={(e) => handleUpdateRole(follower.id, e.target.value)}
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
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p>У вас пока нет последователей на Streamers Universe.</p>
          <p className={styles.emptyStateInfo}>Они появятся, когда другие пользователи найдут вас через поиск и нажмут "Стать последователем".</p>
          <button onClick={handleRetry} className={styles.button}>Обновить данные</button>
        </div>
      )}
      
      <div className={styles.navigationLinks}>
        <button onClick={() => router.push('/menu')} className={styles.menuButton}>
          Вернуться в меню
        </button>
        <button onClick={() => router.push('/followers')} className={styles.suButton}>
          Показать фолловеров Twitch
        </button>
      </div>
    </div>
  );
} 