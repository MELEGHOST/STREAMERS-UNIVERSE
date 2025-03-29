'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './followings.module.css';
import { getUserStats, getUserFollowings } from '../utils/twitchAPI';
import Cookies from 'js-cookie';
import Image from 'next/image';

export default function Followings() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [followings, setFollowings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalFollowings, setTotalFollowings] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Проверяем все возможные источники данных авторизации
        const accessToken = Cookies.get('twitch_access_token');
        const userDataCookie = Cookies.get('twitch_user') || Cookies.get('twitch_user_data');
        const localStorageAuth = localStorage.getItem('is_authenticated') === 'true';
        const localStorageUser = localStorage.getItem('twitch_user');
        
        // Устанавливаем куку для middleware, чтобы указать, что у нас есть данные в localStorage
        if (localStorageUser) {
          Cookies.set('has_local_storage_token', 'true', { 
            expires: 1, // 1 день
            path: '/',
            sameSite: 'lax'
          });
          console.log('Установлена кука has_local_storage_token для middleware');
        }
        
        const isAuth = accessToken || userDataCookie || localStorageAuth || localStorageUser;
        
        if (!isAuth) {
          console.log('Пользователь не авторизован, перенаправляем на страницу авторизации');
          router.push('/auth');
          return;
        }
        
        setIsAuthenticated(true);
        
        // Получаем данные пользователя
        let userData = null;
        
        if (localStorageUser) {
          try {
            userData = JSON.parse(localStorageUser);
          } catch (e) {
            console.error('Ошибка при парсинге данных пользователя из localStorage:', e);
          }
        } else if (userDataCookie) {
          try {
            userData = JSON.parse(userDataCookie);
          } catch (e) {
            console.error('Ошибка при парсинге данных пользователя из cookie:', e);
          }
        }
        
        if (!userData || !userData.id) {
          console.error('Данные пользователя отсутствуют, перенаправление на страницу авторизации');
          router.push('/auth');
          return;
        }
        
        setUserId(userData.id);
        
        // Сначала пробуем загрузить статистику пользователя, которая включает followings
        try {
          const userStats = await getUserStats(userData.id);
          if (userStats && userStats.followings && userStats.followings.recentFollowings) {
            setFollowings(userStats.followings.recentFollowings);
            setTotalFollowings(userStats.followings.total || userStats.followings.recentFollowings.length);
            setLoading(false);
            return;
          }
        } catch (statsError) {
          console.error('Ошибка при загрузке статистики пользователя:', statsError);
          // Продолжаем и пробуем загрузить followings напрямую
        }
        
        // Если не удалось получить данные из статистики, загружаем напрямую
        await loadFollowings(userData.id);
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        setError('Произошла ошибка при загрузке данных. Пожалуйста, попробуйте позже.');
        setLoading(false);
      }
    };
    
    loadData();
  }, [router]);
  
  // Загрузка фолловингов с использованием API
  const loadFollowings = async (userId) => {
    try {
      setLoading(true);
      
      // Загружаем фолловинги с использованием функции из twitchAPI
      const followingsData = await getUserFollowings(userId);
      
      if (followingsData && followingsData.followings) {
        setFollowings(followingsData.followings);
        setTotalFollowings(followingsData.total || followingsData.followings.length);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Ошибка при загрузке фолловингов:', error);
      setError('Не удалось загрузить данные о подписках. Пожалуйста, попробуйте позже.');
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    setLoading(true);
    setError(null);
    if (userId) {
      // Сначала пробуем загрузить статистику пользователя
      try {
        const userStats = await getUserStats(userId);
        if (userStats && userStats.followings && userStats.followings.recentFollowings) {
          setFollowings(userStats.followings.recentFollowings);
          setTotalFollowings(userStats.followings.total || userStats.followings.recentFollowings.length);
          setLoading(false);
          return;
        }
      } catch (statsError) {
        console.error('Ошибка при загрузке статистики пользователя:', statsError);
        // Продолжаем и пробуем загрузить followings напрямую
      }
      
      // Если не удалось получить данные из статистики, загружаем напрямую
      await loadFollowings(userId);
    } else {
      setError('ID пользователя не найден. Пожалуйста, перезайдите в аккаунт.');
      setLoading(false);
    }
  };

  if (!isAuthenticated || loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Загрузка подписок...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h1>Ошибка при загрузке подписок</h1>
        <p className={styles.errorMessage}>{error}</p>
        <button className={styles.button} onClick={handleRetry}>
          Попробовать снова
        </button>
        <Link href="/menu" className={styles.button}>
          Вернуться в меню
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.followingsContainer}>
      <h1>Ваши фолловинги Twitch</h1>
      <p className={styles.description}>
        Здесь отображаются каналы, на которые вы подписаны на Twitch.
        {totalFollowings > 0 && (
          <span className={styles.totalCount}> Всего подписок: {totalFollowings}</span>
        )}
      </p>
      
      <Link href="/menu" className={styles.backButton}>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
        </svg>
        Меню
      </Link>
      
      {followings.length > 0 ? (
        <div className={styles.followingsList}>
          {followings.map(following => (
            <div key={following.id} className={styles.followingCard}>
              <div className={styles.followingAvatar}>
                {following.profileImageUrl ? (
                  <Image 
                    src={following.profileImageUrl} 
                    alt={following.name} 
                    width={60}
                    height={60}
                    className={styles.avatarImage}
                    onError={(e) => { e.target.src = 'https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517fe-def4-11e9-948e-784f43822e80-profile_image-70x70.png'; }}
                  />
                ) : (
                  <div className={styles.defaultAvatar}>
                    {following.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className={styles.followingInfo}>
                <h3>{following.name}</h3>
                {following.login && <p className={styles.followingLogin}>@{following.login}</p>}
                <p className={styles.followDate}>
                  Подписаны с {new Date(following.followedAt).toLocaleDateString('ru-RU')}
                </p>
              </div>
              <div className={styles.followingActions}>
                {following.login && (
                  <>
                    <a 
                      href={`https://twitch.tv/${following.login}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={styles.twitchButton}
                    >
                      Перейти на канал
                    </a>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p>У вас пока нет подписок на Twitch{totalFollowings > 0 ? ', или произошла ошибка при их загрузке.' : '.'}</p>
          {totalFollowings > 0 && (
            <button className={styles.button} onClick={handleRetry}>
              Попробовать загрузить снова
            </button>
          )}
        </div>
      )}
      
      <Link href="/menu" className={styles.button}>
        Вернуться в меню
      </Link>
    </div>
  );
} 