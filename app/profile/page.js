'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Добавляем Link для кнопки
import CyberAvatar from '../components/CyberAvatar'; // Импортируем заглушку
import styles from './profile.module.css';
import { useAuth } from '../contexts/AuthContext';

// Функция для перевода типа канала
const translateBroadcasterType = (type) => {
  switch (type) {
    case 'affiliate': return 'Компаньон';
    case 'partner': return 'Партнёр';
    case '': return 'Обычный'; // Если тип пустой
    default: return type || 'Неизвестно'; // Возвращаем как есть или 'Неизвестно'
  }
};

function ProfilePage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, supabase } = useAuth();
  
  const [twitchUserData, setTwitchUserData] = useState(null);
  const [profileData, setProfileData] = useState(null); // Состояние для данных из таблицы profiles
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState(null);
  
  const twitchUserId = user?.user_metadata?.provider_id;

  // Перенаправляем на /auth, если не аутентифицирован
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('[ProfilePage] Пользователь не аутентифицирован, редирект на /auth');
      router.push('/auth?message=Session+expired+or+not+found&next=/profile');
    }
  }, [isLoading, isAuthenticated, router]);

  // Общая функция загрузки данных (Twitch + Профиль из БД)
  const loadAllData = useCallback(async () => {
      if (!user || !supabase || !twitchUserId) {
          console.warn("[ProfilePage] Отсутствует user, supabase или twitchUserId, загрузка прервана.");
          setLoadingProfile(false); // Останавливаем общую загрузку
          if (!twitchUserId && isAuthenticated) {
             setError("Не удалось получить Twitch ID для загрузки данных.");
          }
          return;
      }
      
      console.log(`[ProfilePage] Загрузка ВСЕХ данных для twitchUserId: ${twitchUserId}, userId: ${user.id}`);
      setLoadingProfile(true);
      setError(null);
      let loadedTwitchData = null;
      let loadedProfileData = null;

      // Кэш для Twitch данных
      const twitchCacheKey = `twitch_user_${twitchUserId}`;
      if (typeof window !== 'undefined') {
          const cachedStr = localStorage.getItem(twitchCacheKey);
          if (cachedStr) {
              try {
                  loadedTwitchData = JSON.parse(cachedStr);
                  setTwitchUserData(loadedTwitchData);
                  console.log('[ProfilePage] Отображены предв. Twitch данные из localStorage.');
              } catch { localStorage.removeItem(twitchCacheKey); }
          }
      }

      try {
          // Параллельно запускаем загрузку Twitch и данных профиля
          const [twitchResponse, profileResponse] = await Promise.all([
              // Запрос Twitch API
              fetch(`/api/twitch/user?userId=${twitchUserId}`),
              // Запрос данных профиля из БД
              supabase
                  .from('user_profiles')
                  .select('birthday, social_links, description')
                  .eq('user_id', user.id)
                  .maybeSingle()
          ]);

          // Обработка ответа Twitch API
          if (!twitchResponse.ok) {
              const errorText = await twitchResponse.text();
              console.error(`[ProfilePage] Ошибка API /api/twitch/user (${twitchResponse.status}): ${errorText}`);
              // Не устанавливаем ошибку, если есть кэш
              if (!loadedTwitchData) {
                 setError(`Не удалось загрузить данные Twitch (${twitchResponse.status}).`);
              } else {
                  console.warn("[ProfilePage] Ошибка загрузки свежих данных Twitch, используем кэш.");
              }
          } else {
              loadedTwitchData = await twitchResponse.json();
              console.log('[ProfilePage] Получены свежие данные Twitch от API:', loadedTwitchData);
              setTwitchUserData(loadedTwitchData);
              if (typeof window !== 'undefined' && loadedTwitchData) {
                  try { localStorage.setItem(twitchCacheKey, JSON.stringify(loadedTwitchData)); } catch (e) { console.error("LS set error", e);}
              }
          }

          // Обработка ответа от Supabase (profiles)
          if (profileResponse.error) {
              console.error("[ProfilePage] Ошибка загрузки данных профиля из БД:", profileResponse.error);
              setError((prevError) => prevError ? `${prevError} | Ошибка загрузки доп. данных профиля.` : 'Ошибка загрузки доп. данных профиля.');
          } else {
              loadedProfileData = profileResponse.data;
              console.log('[ProfilePage] Получены данные профиля из БД:', loadedProfileData);
              setProfileData(loadedProfileData); // Устанавливаем данные профиля (birthday, social_links, description)
          }

      } catch (fetchError) {
          console.error('[ProfilePage] Критическая ошибка при fetch данных:', fetchError);
          setError(`Критическая ошибка загрузки: ${fetchError.message}.`);
          // Оставляем кэшированные данные, если они есть
      } finally {
          setLoadingProfile(false); 
      }
  }, [user, supabase, twitchUserId, isAuthenticated]); // Добавляем зависимость isAuthenticated

  // Загружаем данные, когда все условия выполнены
  useEffect(() => {
    if (!isLoading && isAuthenticated && user && twitchUserId && supabase) {
      loadAllData();
    } else if (!isLoading && !isAuthenticated) {
      console.log('[ProfilePage] Пользователь не аутентифицирован, редирект на /auth');
      router.push('/auth?message=Session+expired+or+not+found&next=/profile');
    }
    // Добавляем проверки на случай отсутствия twitchUserId или user после аутентификации
    else if (!isLoading && isAuthenticated && !user) {
        console.error("[ProfilePage] Пользователь аутентифицирован, но объект user отсутствует!");
        setError("Произошла ошибка аутентификации. Попробуйте перезайти.");
        setLoadingProfile(false);
    } else if (!isLoading && isAuthenticated && user && !twitchUserId) {
         console.error("[ProfilePage] Пользователь аутентифицирован, но Twitch ID (provider_id) отсутствует в user_metadata!");
         setError("Не удалось получить Twitch ID из данных аутентификации.");
         setLoadingProfile(false);
    }
  }, [isLoading, isAuthenticated, user, twitchUserId, supabase, loadAllData, router]);

  // Определяем данные для отображения
  const displayName = twitchUserData?.display_name || user?.user_metadata?.full_name || 'Загрузка...';
  const avatarUrl = twitchUserData?.profile_image_url || user?.user_metadata?.avatar_url || '/images/default_avatar.png';
  const viewCount = twitchUserData?.view_count;
  const createdAt = twitchUserData?.created_at;
  const broadcasterType = twitchUserData?.broadcaster_type;

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
       <div className={styles.topBar}>
         <button onClick={() => router.push('/menu')} className={styles.backButton}>
           &larr; Назад в меню
         </button>
         {/* Кнопка редактирования */} 
         <Link href="/edit-profile" className={styles.editButton}>
            Редактировать профиль
         </Link>
       </div>

      {error && <div className={styles.errorMessage}>{error}</div>} 

      <div className={styles.profileHeader}>
        {(loadingProfile && !twitchUserData && !profileData) ? (
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
              <div className={styles.profileStats}>
                {viewCount !== undefined && <span className={styles.statItem}>👁️ Просмотры: {viewCount.toLocaleString('ru-RU')}</span>}
                {createdAt && <span className={styles.statItem}>📅 На Twitch с: {formatDate(createdAt)}</span>}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Основной контент профиля (Информация Twitch + Описание) */} 
      <div className={styles.profileContent}>
        <h2>Информация</h2>
        {loadingProfile ? (
           <div className={styles.skeletonSection}>
              <div className={`${styles.skeletonText} ${styles.skeleton}`}></div>
              <div className={`${styles.skeletonText} ${styles.skeleton}`}></div>
              <div className={`${styles.skeletonText} ${styles.skeleton.short}`}></div>
           </div>
        ) : (
          <div className={styles.infoGrid}> 
            {/* Twitch Info */}
            {twitchUserData && (
               <div className={styles.infoItem}>
                 <span className={styles.infoLabel}>Тип канала Twitch:</span>
                 <span className={styles.infoValue}>{translateBroadcasterType(twitchUserData.broadcaster_type)}</span>
               </div>
            )}
            {/* Profile Description */}
            {profileDescription && (
               <div className={styles.infoItem} style={{ gridColumn: '1 / -1' }}> {/* Растягиваем на обе колонки */} 
                 <span className={styles.infoLabel}>О себе:</span>
                 {/* Используем white-space: pre-wrap для сохранения переносов строк */}
                 <span className={styles.infoValue} style={{ whiteSpace: 'pre-wrap' }}>
                     {profileDescription}
                 </span>
               </div>
            )}
            {/* Если нет ни того, ни другого (и не загрузка) */} 
            {!twitchUserData && !profileDescription && !loadingProfile && (
                <p>Дополнительная информация отсутствует.</p>
            )}
          </div>
        )}
      </div>

      {/* Ссылки на соцсети */} 
      {profileSocialLinks && (
          <div className={styles.profileContent}>
            <h2>Социальные сети</h2>
            {loadingProfile ? (
                <div className={styles.skeletonSection}>
                   <div className={`${styles.skeletonText} ${styles.skeleton}`}></div>
                </div>
            ) : (
               <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                  {typeof profileSocialLinks === 'object' && profileSocialLinks !== null 
                      ? JSON.stringify(profileSocialLinks, null, 2) 
                      : profileSocialLinks /* Если не объект, показываем как строку (на случай если в базе текст) */}
               </div>
            )}
          </div>
      )}

    </div>
  );
}

export default ProfilePage; 