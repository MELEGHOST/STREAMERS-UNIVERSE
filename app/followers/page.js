'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './followers.module.css';
import { getUserFollowers, getUserData, getAccessToken, isStreamer } from '../utils/twitchAPI';
import { DataStorage } from '../utils/dataStorage';

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
        
        // Определяем статус стримера с помощью новой функции
        setIsStreamer(isStreamer(userData));
        
        // Получаем и устанавливаем роли из хранилища
        const savedRoles = await DataStorage.getData('follower_roles');
        if (savedRoles) {
          setRoles(savedRoles);
        }
        
        // Загружаем данные о фолловерах
        await loadFollowers(userData.id);
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        setError('Не удалось загрузить данные. Пожалуйста, попробуйте позже.');
        setLoading(false);
      }
    };
    
    loadData();
  }, [router]);
  
  // Загрузка фолловеров с использованием нового метода
  const loadFollowers = async (userId) => {
    try {
      setLoading(true);
      
      // Сначала быстро проверяем кэш
      const cachedFollowers = await DataStorage.getData('followers');
      if (cachedFollowers && cachedFollowers.followers) {
        // Если есть кэшированные данные, сразу используем их
        setFollowers(cachedFollowers.followers);
        setTotalFollowers(cachedFollowers.total || cachedFollowers.followers.length);
        
        // Быстро убираем состояние загрузки
        setLoading(false);
        
        // Затем обновляем данные в фоне, если они устарели
        if (!cachedFollowers.timestamp || (Date.now() - cachedFollowers.timestamp > 3600000)) {
          try {
            // Делаем запрос в фоне
            const followersData = await getUserFollowers(userId);
            if (followersData && followersData.followers) {
              // Обновляем состояние, если получены новые данные и они отличаются от кэша
              if (JSON.stringify(followersData.followers) !== JSON.stringify(cachedFollowers.followers)) {
                setFollowers(followersData.followers);
                setTotalFollowers(followersData.total || followersData.followers.length);
              }
            }
          } catch (backgroundError) {
            console.warn('Фоновое обновление данных о фолловерах не удалось:', backgroundError);
            // Не показываем ошибку пользователю, так как у нас уже есть кэшированные данные
          }
        }
        
        return; // Выходим из функции, так как данные уже отображены
      }
      
      // Если кэша нет, делаем обычный запрос
      const followersData = await getUserFollowers(userId);
      
      if (followersData && followersData.followers) {
        setFollowers(followersData.followers);
        setTotalFollowers(followersData.total || followersData.followers.length);
      } else {
        // Если данные не получены, показываем пустой список
        setFollowers([]);
        setTotalFollowers(0);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Ошибка при загрузке фолловеров:', error);
      setError('Не удалось загрузить данные о фолловерах. Пожалуйста, попробуйте позже.');
      setFollowers([]);
      setTotalFollowers(0);
      setLoading(false);
    }
  };
  
  // Функция для сохранения ролей фолловеров
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

  const handleRetry = async () => {
    setLoading(true);
    setError(null);
    if (userId) {
      const accessToken = getAccessToken();
      if (!accessToken) {
        setError('Отсутствует токен доступа. Пожалуйста, перезайдите в аккаунт.');
        setLoading(false);
        return;
      }
      await loadFollowers(userId);
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