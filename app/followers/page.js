'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getUserData } from '../utils/twitchAPI';
import styles from './followers.module.css';
import { DataStorage } from '../utils/dataStorage';
import Footer from '../components/Footer';

export default function Followers() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [roles, setRoles] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalFollowers, setTotalFollowers] = useState(0);
  const [profileData, setProfileData] = useState(null);

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
        
        // Получаем и устанавливаем роли из хранилища
        const savedRoles = await DataStorage.getData('follower_roles');
        if (savedRoles) {
          setRoles(savedRoles);
        }
        
        // Загружаем данные о фолловерах
        await loadFollowers(userData.id);

        // Получаем данные профиля пользователя
        const profileData = await getUserData();
        setProfileData(profileData);
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
      
      // Проверяем наличие токена доступа
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setError('Отсутствует токен доступа. Пожалуйста, перезайдите в аккаунт.');
        setLoading(false);
        return;
      }
      
      // Делаем прямой запрос к API для получения актуальных данных
      console.log('Запрашиваем актуальные данные о фолловерах для пользователя:', userId);
      
      const response = await fetch(`/api/twitch/user-followers?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error('Ошибка при получении фолловеров:', response.status);
        setError('Не удалось получить данные о фолловерах. Пожалуйста, попробуйте позже.');
        setLoading(false);
        return;
      }
      
      const followersData = await response.json();
      
      // Проверяем наличие ошибки в ответе
      if (followersData.error) {
        console.error('Ошибка при получении фолловеров:', followersData.error);
        setError(`Ошибка: ${followersData.error}`);
        setLoading(false);
        return;
      }
      
      console.log('Получены данные о фолловерах:', {
        total: followersData.total || 0,
        count: followersData.followers?.length || 0
      });
      
      // Обновляем данные в состоянии
      if (followersData && followersData.followers) {
        // Обработка аватаров - убедимся, что у каждого фолловера есть URL аватара
        const followersWithAvatars = followersData.followers.map(follower => ({
          ...follower,
          profileImageUrl: follower.profileImageUrl || '/images/default-avatar.png'
        }));
        
        // Проверяем регистрацию на Streamers Universe для каждого фолловера
        try {
          const response = await fetch('/api/su/registered-users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              twitchIds: followersWithAvatars.map(f => f.id)
            })
          });
          
          if (response.ok) {
            const registeredData = await response.json();
            
            // Обрабатываем случай, когда нет данных в ответе
            if (!registeredData.registeredIds) {
              console.error('Ответ API не содержит данных о регистрации');
              setFollowers(followersWithAvatars);
              setTotalFollowers(followersData.total || followersWithAvatars.length);
              return;
            }
            
            // Обновляем информацию о регистрации для каждого фолловера
            const followersWithRegistrationInfo = followersWithAvatars.map(follower => ({
              ...follower,
              isRegisteredOnSU: registeredData.registeredIds.includes(follower.id),
              suUserType: registeredData.userTypes[follower.id] || 'viewer'
            }));
            
            setFollowers(followersWithRegistrationInfo);
            setTotalFollowers(followersData.total || followersWithRegistrationInfo.length);
            
            // Сохраняем в кэш для будущего использования
            await DataStorage.saveData('followers', {
              ...followersData,
              followers: followersWithRegistrationInfo,
              timestamp: Date.now()
            });
          } else {
            console.error('Не удалось получить данные о регистрации на SU:', response.status);
            // Продолжаем без данных о регистрации
            setFollowers(followersWithAvatars);
            setTotalFollowers(followersData.total || followersWithAvatars.length);
          }
        } catch (error) {
          console.error('Ошибка при проверке регистрации на SU:', error);
          // Продолжаем без данных о регистрации
          setFollowers(followersWithAvatars);
          setTotalFollowers(followersData.total || followersWithAvatars.length);
        }
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
    <div className={styles.followersPage}>
      <h1 className={styles.title}>Фолловеры Twitch</h1>
      <p className={styles.subtitle}>Список пользователей, подписанных на ваш канал Twitch. {totalFollowers > 0 && <span>Всего: <strong>{totalFollowers}</strong></span>}</p>
      
      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Загрузка фолловеров...</p>
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
              <p>Отображаются фолловеры Twitch с канала: <strong>{profileData?.displayName || profileData?.login || userId}</strong></p>
            </div>
            <div className={styles.filterOptions}>
              <select 
                className={styles.filterSelect}
                onChange={(e) => {
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
                    onError={(e) => {e.target.src = '/images/default-avatar.png'}}
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
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p>У вас пока нет фолловеров на Twitch.</p>
          <button onClick={handleRetry} className={styles.button}>Обновить данные</button>
        </div>
      )}
      
      <div className={styles.navigationLinks}>
        <button onClick={() => router.push('/menu')} className={styles.menuButton}>
          Вернуться в меню
        </button>
        <button onClick={() => router.push('/followers/su')} className={styles.suButton}>
          Показать последователей Streamers Universe
        </button>
      </div>
    </div>
  );
} 