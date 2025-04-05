'use client';

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import styles from './profile.module.css';
import SocialButton from '../components/SocialButton';
import AchievementsSystem from '../components/AchievementsSystem';
import ReviewSection from '../components/ReviewSection';
import { checkBirthday } from '../utils/birthdayCheck';
import { DataStorage } from '../utils/dataStorage';
import { createBrowserClient } from '@supabase/ssr';
import CyberAvatar from '../components/CyberAvatar';
import { useAuth } from '../contexts/AuthContext';

// Компонент-заглушка для Suspense
function ProfileLoadingFallback() {
  return (
    <div className={styles.container}>
      <div className={styles.profileContainer}>
        <div className={styles.profileHeader}>
          <h1>Загрузка профиля...</h1>
          <div className={styles.spinner}></div>
        </div>
      </div>
    </div>
  );
}

// Оборачиваем основной компонент в Suspense
export default function ProfilePageWrapper() {
  return (
    <Suspense fallback={<ProfileLoadingFallback />}>
      <Profile />
    </Suspense>
  );
}

function Profile() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  
  const [twitchUserData, setTwitchUserData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState(null);
  
  const userId = user?.id;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('[ProfilePage] Пользователь не аутентифицирован, перенаправление на /auth');
      router.push('/auth?message=Session expired or not found&next=/profile');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchTwitchUserData = useCallback(async (idToFetch) => {
    if (!idToFetch) return;
    console.log(`[ProfilePage] Загрузка данных Twitch для userId: ${idToFetch}...`);
    setError(null);
    setLoadingProfile(true);

    let cachedDisplayData = null;
    if (typeof window !== 'undefined') {
      const cachedKey = `twitch_user_${idToFetch}`;
      const cachedStr = localStorage.getItem(cachedKey);
      if (cachedStr) {
        try {
          cachedDisplayData = JSON.parse(cachedStr);
          setTwitchUserData(cachedDisplayData);
          console.log('[ProfilePage] Отображены предварительные данные из localStorage.');
        } catch (_) {
          console.warn('[ProfilePage] Ошибка парсинга кэша localStorage.');
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
        setError(`Не удалось загрузить данные профиля с Twitch (${response.status}).`);
      } else {
        const data = await response.json();
        console.log('[ProfilePage] Получены свежие данные от API:', data);
        setTwitchUserData(data);
        if (typeof window !== 'undefined' && data) {
            const cacheKey = `twitch_user_${idToFetch}`;
            try {
               localStorage.setItem(cacheKey, JSON.stringify(data));
               console.log('[ProfilePage] Свежие данные сохранены в localStorage.');
            } catch (storageError) {
               console.error('[ProfilePage] Ошибка сохранения в localStorage:', storageError);
            }
        }
      }
    } catch (fetchError) {
      console.error('[ProfilePage] Критическая ошибка при fetch Twitch data:', fetchError);
      setError(`Критическая ошибка загрузки профиля: ${fetchError.message}`);
    } finally {
      setLoadingProfile(false); 
    }
  }, []);

  useEffect(() => {
    if (userId) {
      console.log(`[ProfilePage] userId (${userId}) появился, запускаем fetchTwitchUserData.`);
      fetchTwitchUserData(userId);
    } else if (!isLoading) {
      console.log('[ProfilePage] Загрузка AuthContext завершена, но userId отсутствует.');
      setLoadingProfile(false);
    }
  }, [userId, isLoading, fetchTwitchUserData]);

  const displayName = twitchUserData?.display_name || user?.user_metadata?.full_name || 'Загрузка...';
  const avatarUrl = twitchUserData?.profile_image_url || user?.user_metadata?.avatar_url || '/images/default_avatar.png';

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Загрузка...</p>
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
    <div className={styles.profileContainer}>
      {error && <div className={styles.errorMessage}>{error}</div>} 

      <div className={styles.profileHeader}>
        {loadingProfile && !twitchUserData ? (
          <div className={styles.skeletonHeader}>
            <div className={`${styles.skeletonAvatar} ${styles.skeleton}`}></div>
            <div className={`${styles.skeletonTextLarge} ${styles.skeleton}`}></div>
          </div>
        ) : (
          <>
            <CyberAvatar 
              src={avatarUrl}
              alt={`Аватар ${displayName}`}
              size="xl" 
              className={styles.profileAvatar} 
              priority={true}
            />
            <h1>{displayName}</h1>
          </>
        )}
      </div>

      <div className={styles.profileContent}>
        {loadingProfile ? (
          <div className={styles.skeletonSection}>
             <div className={`${styles.skeletonTextMedium} ${styles.skeleton}`}></div>
             <div className={`${styles.skeletonText} ${styles.skeleton}`}></div>
             <div className={`${styles.skeletonText} ${styles.skeleton}`}></div>
          </div>
        ) : twitchUserData ? (
          <div>
            <p>ID пользователя: {twitchUserData.id}</p>
            <p>Описание: {twitchUserData.description || 'Не указано'}</p>
            <p>Просмотры: {twitchUserData.view_count}</p>
          </div>
        ) : (
          <p>Не удалось загрузить детальную информацию профиля.</p>
        )}
      </div>
      
      <button onClick={() => router.push('/menu')} className={styles.backButton}>
        Назад в меню
      </button>
    </div>
  );
} 