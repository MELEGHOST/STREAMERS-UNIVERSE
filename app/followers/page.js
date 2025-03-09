'use client';

import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import styles from './followers.module.css';
import { getUserFollowers, getUserFromLocalStorage, getAccessTokenFromCookie, safeLocalStorage } from '../utils/twitchAPI';

export default function Followers() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [isStreamer, setIsStreamer] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [roles, setRoles] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalFollowers, setTotalFollowers] = useState(0);

  useEffect(() => {
    const accessToken = getAccessTokenFromCookie();
    if (!accessToken) {
      console.error('Отсутствует токен доступа, перенаправление на страницу авторизации');
      router.push('/auth');
      return;
    }
    
    const loadData = async () => {
      try {
        setIsAuthenticated(true);
        // Получаем данные пользователя из localStorage
        const storedUser = getUserFromLocalStorage();
        if (!storedUser) {
          console.error('Отсутствуют данные пользователя');
          setLoading(false);
          setError('Не удалось загрузить данные пользователя. Пожалуйста, перезайдите в аккаунт.');
          return;
        }
        
        const userId = storedUser.id || 'unknown';
        setUserId(userId);
        setIsStreamer(storedUser.isStreamer || true); // Временно устанавливаем всех пользователей как стримеров

        console.log('Загружаем фолловеров для пользователя:', userId);

        // Получаем фолловеров через наш API
        await fetchFollowers(userId, accessToken);

        const savedRoles = JSON.parse(localStorage.getItem(`roles_${userId}`)) || {};
        setRoles(savedRoles);
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        setError('Произошла ошибка при загрузке данных. Попробуйте обновить страницу.');
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const fetchFollowers = async (userId, accessToken) => {
    try {
      console.log('Выполняем запрос к API для получения фолловеров...');
      
      // Используем нашу утилиту для получения фолловеров
      const data = await getUserFollowers(userId, accessToken);
      
      console.log('Получены данные о фолловерах:', {
        total: data.total,
        count: data.followers?.length || 0
      });
      
      setTotalFollowers(data.total || 0);
      
      if (data && data.followers) {
        const formattedFollowers = data.followers.map(follower => ({
          id: follower.id,
          name: follower.name,
          followedAt: new Date(follower.followedAt).toLocaleDateString('ru-RU')
        }));
        
        setFollowers(formattedFollowers);
        
        // Сохраняем данные в localStorage для кэширования
        safeLocalStorage(`followers_${userId}`, formattedFollowers);
      }
    } catch (error) {
      console.error('Ошибка при получении фолловеров:', error);
      setError(`Не удалось загрузить фолловеров: ${error.message}`);
      
      // Пробуем загрузить из кэша, если API недоступен
      try {
        const cachedFollowers = JSON.parse(localStorage.getItem(`followers_${userId}`)) || [];
        if (cachedFollowers.length > 0) {
          console.log('Загружаем фолловеров из кэша:', cachedFollowers.length);
          setFollowers(cachedFollowers);
        }
      } catch (cacheError) {
        console.error('Ошибка при получении фолловеров из кэша:', cacheError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = (followerId, role) => {
    const updatedRoles = { ...roles, [followerId]: role };
    setRoles(updatedRoles);
    safeLocalStorage(`roles_${userId}`, updatedRoles);
    console.log(`Назначена роль ${role} для фолловера ${followerId}`);
  };

  const handleRetry = async () => {
    setLoading(true);
    setError(null);
    if (userId) {
      const accessToken = getAccessTokenFromCookie();
      if (!accessToken) {
        setError('Отсутствует токен доступа. Пожалуйста, перезайдите в аккаунт.');
        setLoading(false);
        return;
      }
      await fetchFollowers(userId, accessToken);
    } else {
      setError('ID пользователя не найден. Пожалуйста, перезайдите в аккаунт.');
      setLoading(false);
    }
  };

  if (!isAuthenticated || loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Загрузка фолловеров...</p>
      </div>
    );
  }

  if (error) {
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
    <div className={styles.followersContainer}>
      <h1>Фолловеры Twitch</h1>
      <p className={styles.description}>
        Здесь отображаются пользователи, которые подписаны на ваш канал на Twitch (фолловеры).
        {totalFollowers > 0 && (
          <span className={styles.totalCount}> Всего фолловеров: {totalFollowers}</span>
        )}
      </p>
      
      {followers.length > 0 ? (
        <div className={styles.followersList}>
          {followers.map(follower => (
            <div key={follower.id} className={styles.followerCard}>
              <div className={styles.followerInfo}>
                <h3>{follower.name}</h3>
                <p className={styles.followDate}>Подписался: {follower.followedAt}</p>
                <p className={styles.roleLabel}>Роль: <span className={styles.roleValue}>{roles[follower.id] || 'Не назначена'}</span></p>
              </div>
              <div className={styles.followerActions}>
                <select 
                  className={styles.roleSelect}
                  value={roles[follower.id] || ''}
                  onChange={(e) => handleAssignRole(follower.id, e.target.value)}
                >
                  <option value="">Выберите роль</option>
                  <option value="mod">Модератор</option>
                  <option value="vip">VIP</option>
                  <option value="regular">Постоянный зритель</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p>У вас пока нет фолловеров на Twitch{totalFollowers > 0 ? ', или произошла ошибка при их загрузке.' : '.'}</p>
          {totalFollowers > 0 && (
            <button className={styles.button} onClick={handleRetry}>
              Попробовать загрузить снова
            </button>
          )}
        </div>
      )}
      
      <button className={styles.button} onClick={() => router.push('/menu')}>
        Вернуться в меню
      </button>
    </div>
  );
} 