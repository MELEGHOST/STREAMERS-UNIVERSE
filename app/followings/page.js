'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import styles from './followings.module.css';
import { getUserData, getUserFollowings, getUserStats } from '../utils/twitchAPI';
import { DataStorage } from '../utils/dataStorage';

export default function Followings() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userLogin, setUserLogin] = useState(null);
  const [followings, setFollowings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalFollowings, setTotalFollowings] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Проверяем авторизацию
        if (!DataStorage.isAuthenticated()) {
          console.error('Пользователь не авторизован, перенаправление на страницу авторизации');
          router.push('/auth');
          return;
        }
        
        setIsAuthenticated(true);
        
        // Получаем данные пользователя
        const userData = await getUserData();
        
        if (!userData || !userData.id) {
          console.error('Данные пользователя отсутствуют, перенаправление на страницу авторизации');
          router.push('/auth');
          return;
        }
        
        setUserId(userData.id);
        setUserLogin(userData.login || userData.display_name);
        
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
        setError('Не удалось загрузить данные. Пожалуйста, попробуйте позже.');
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
                  <img 
                    src={following.profileImageUrl} 
                    alt={following.name} 
                    className={styles.avatarImage}
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