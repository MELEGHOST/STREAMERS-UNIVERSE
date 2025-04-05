'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import CyberAvatar from '../components/CyberAvatar'; // Импортируем заглушку
import styles from './profile.module.css';
import { useAuth } from '../contexts/AuthContext';

function ProfilePage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  
  const [twitchUserData, setTwitchUserData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState(null);
  
  const userId = user?.id; 

  // Перенаправляем на /auth, если не аутентифицирован
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('[ProfilePage] Пользователь не аутентифицирован, редирект на /auth');
      router.push('/auth?message=Session+expired+or+not+found&next=/profile');
    }
  }, [isLoading, isAuthenticated, router]);

  // Функция для загрузки данных с Twitch API
  const fetchTwitchUserData = useCallback(async (idToFetch) => {
    if (!idToFetch) return;
    console.log(`[ProfilePage] Загрузка данных Twitch для userId: ${idToFetch}...`);
    setError(null);
    setLoadingProfile(true);

    let cachedDisplayData = null;
    const cachedKey = `twitch_user_${idToFetch}`;
    if (typeof window !== 'undefined') {
      const cachedStr = localStorage.getItem(cachedKey);
      if (cachedStr) {
        try {
          cachedDisplayData = JSON.parse(cachedStr);
          setTwitchUserData(cachedDisplayData); // Показываем кэш сразу
          console.log('[ProfilePage] Отображены предв. данные из localStorage.');
        } catch (_) {
           localStorage.removeItem(cachedKey); // Удаляем битый кэш
        }
      }
    }

    try {
      const apiUrl = `/api/twitch/user?userId=${idToFetch}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        const errorText = await response.text();
        const errorMsg = `[ProfilePage] Ошибка API /api/twitch/user (${response.status}): ${errorText}`;
        console.error(errorMsg);
        setError(`Не удалось загрузить данные (${response.status}). Используются кэшированные данные, если есть.`);
        // Оставляем twitchUserData (кэш)
      } else {
        const data = await response.json();
        console.log('[ProfilePage] Получены свежие данные от API:', data);
        setTwitchUserData(data); // Устанавливаем свежие данные
        // Сохраняем свежие данные в localStorage
        if (typeof window !== 'undefined' && data) {
            try {
               localStorage.setItem(cachedKey, JSON.stringify(data));
               console.log('[ProfilePage] Свежие данные сохранены в localStorage.');
            } catch (storageError) {
               console.error('[ProfilePage] Ошибка сохранения в localStorage:', storageError);
            }
        }
      }
    } catch (fetchError) {
      console.error('[ProfilePage] Критическая ошибка при fetch Twitch data:', fetchError);
      setError(`Критическая ошибка загрузки: ${fetchError.message}. Используются кэшированные данные, если есть.`);
      // Оставляем кэшированные данные
    } finally {
      setLoadingProfile(false); 
    }
  }, []); // Зависимостей нет

  // Загружаем данные, когда появляется userId
  useEffect(() => {
    if (userId) {
      fetchTwitchUserData(userId);
    } else if (!isLoading) {
      setLoadingProfile(false); // AuthContext загружен, userId нет
    }
  }, [userId, isLoading, fetchTwitchUserData]);

  // Определяем данные для отображения (с учетом кэша или данных из AuthContext)
  const displayName = twitchUserData?.display_name || user?.user_metadata?.full_name || 'Загрузка...';
  const avatarUrl = twitchUserData?.profile_image_url || user?.user_metadata?.avatar_url || '/images/default_avatar.png';
  const description = twitchUserData?.description || '';
  const viewCount = twitchUserData?.view_count;
  const createdAt = twitchUserData?.created_at;

  // Функция форматирования даты
  const formatDate = (dateString) => {
    if (!dateString) return 'Неизвестно';
    try {
      return new Date(dateString).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return 'Неверная дата'; }
  };

  // --- Отображение --- 
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className="spinner"></div>
        <p>Загрузка профиля...</p>
      </div>
    );
  }
  if (!isAuthenticated) {
     return (
      <div className={styles.loadingContainer}>
        <p>Перенаправление на страницу входа...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <button onClick={() => router.push('/menu')} className={styles.backButton}>
        &larr; Назад в меню
      </button>

      {error && <div className={styles.errorMessage}>{error}</div>} 

      <div className={styles.profileHeader}>
        {/* Скелет для шапки */} 
        {(loadingProfile && !twitchUserData) ? (
          <div className={styles.skeletonHeader}>
            <div className={`${styles.skeletonAvatar} ${styles.skeleton}`}></div>
            <div style={{ flexGrow: 1 }}>
                <div className={`${styles.skeletonTextLarge} ${styles.skeleton}`}></div>
                <div className={`${styles.skeletonText} ${styles.skeleton}`}></div>
            </div>
          </div>
        ) : (
          <>
            <CyberAvatar 
              src={avatarUrl}
              alt={`Аватар ${displayName}`}
              size="lg" // Увеличим размер аватара
              className={styles.profileAvatar} 
              priority={true}
              onError={(e) => { e.target.src = '/images/default_avatar.png'; }} 
            />
            <div className={styles.profileDetails}>
              <h1>{displayName}</h1>
              {description && <p className={styles.description}>{description}</p>}
              <div className={styles.profileStats}>
                {viewCount !== undefined && <span className={styles.statItem}>👁️ Просмотры: {viewCount.toLocaleString('ru-RU')}</span>}
                {createdAt && <span className={styles.statItem}>📅 На Twitch с: {formatDate(createdAt)}</span>}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Основной контент профиля */} 
      <div className={styles.profileContent}>
        <h2>Информация</h2>
        {/* Скелет для контента */} 
        {loadingProfile ? (
          <div className={styles.skeletonSection}>
             <div className={`${styles.skeletonText} ${styles.skeleton}`}></div>
             <div className={`${styles.skeletonText} ${styles.skeleton}`}></div>
             <div className={`${styles.skeletonText} ${styles.skeleton.short}`}></div>
          </div>
        ) : twitchUserData ? (
          <div>
            <p><strong>ID:</strong> {twitchUserData.id}</p>
            <p><strong>Логин:</strong> {twitchUserData.login}</p>
            <p><strong>Тип:</strong> {twitchUserData.broadcaster_type || '-'}</p>
            {/* Здесь будет место для других секций */} 
          </div>
        ) : (
          <p>Не удалось загрузить детальную информацию профиля.</p>
        )}
      </div>
    </div>
  );
}

export default ProfilePage; 