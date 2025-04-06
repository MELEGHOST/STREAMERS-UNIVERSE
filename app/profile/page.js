'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Добавляем Link для кнопки
import CyberAvatar from '../components/CyberAvatar'; // Импортируем заглушку
import styles from './profile.module.css';
import { useAuth } from '../contexts/AuthContext';
// import SocialLinkButton from '../components/SocialLinkButton/SocialLinkButton'; // <<< Удаляем старый импорт
import StyledSocialButton from '../components/StyledSocialButton/StyledSocialButton'; // <<< Импортируем новый

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
  const [profileData, setProfileData] = useState(null);
  const [followersCount, setFollowersCount] = useState(undefined); // undefined для начального состояния
  const [videos, setVideos] = useState([]); // Массив для VODs
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

  // --- Функция форматирования длительности видео ---
  const formatDuration = (durationString) => {
    if (!durationString) return '0m';
    let totalSeconds = 0;
    const hoursMatch = durationString.match(/(\d+)h/);
    const minutesMatch = durationString.match(/(\d+)m/);
    const secondsMatch = durationString.match(/(\d+)s/);
    if (hoursMatch) totalSeconds += parseInt(hoursMatch[1], 10) * 3600;
    if (minutesMatch) totalSeconds += parseInt(minutesMatch[1], 10) * 60;
    if (secondsMatch) totalSeconds += parseInt(secondsMatch[1], 10);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let formatted = '';
    if (hours > 0) formatted += `${hours}h `;
    if (minutes > 0 || hours > 0) formatted += `${minutes}m `;
    if (seconds > 0 || totalSeconds === 0) formatted += `${seconds}s`; // Показываем секунды, если есть, или если все 0
    
    return formatted.trim() || '0s'; // Гарантируем возврат хотя бы '0s'
  };

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
                   // Загружаем из кэша все, кроме видео и фолловеров
                   const cached = JSON.parse(cachedStr);
                   loadedTwitchData = { ...cached, videos: [], followers_count: undefined };
                   setTwitchUserData(loadedTwitchData);
                   // Устанавливаем фолловеров и видео из кэша, если они там есть (хотя их там не будет)
                   setFollowersCount(cached.followers_count);
                   setVideos(cached.videos || []); 
                   console.log('[ProfilePage] Отображены предв. Twitch данные из localStorage.');
              } catch { localStorage.removeItem(twitchCacheKey); }
          }
      }

      try {
          // Запрос к нашему обновленному API
          const response = await fetch(`/api/twitch/user?userId=${twitchUserId}`, {
              headers: {
                  // Передаем JWT для авторизации
                  'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`
              }
          });

          if (!response.ok) {
              const errorText = await response.text();
              const errorMsg = `Ошибка API /api/twitch/user (${response.status}): ${errorText}`; 
              console.error(`[ProfilePage] ${errorMsg}`);
              setError(`Не удалось загрузить данные Twitch (${response.status}).`);
              // Оставляем кэш, если он был
          } else {
              const data = await response.json();
              console.log('[ProfilePage] Получены свежие данные от API:', data);
              setTwitchUserData(data);
              setFollowersCount(data.followers_count); // Устанавливаем фолловеров
              setVideos(data.videos || []); // Устанавливаем видео
              // Сохраняем все данные в localStorage
              if (typeof window !== 'undefined') {
                 try { localStorage.setItem(twitchCacheKey, JSON.stringify(data)); } catch (e) { console.error("LS set error", e);}
              }
          }
          
          // Запрос данных профиля из БД (можно оставить параллельным или сделать последовательным)
          const { data: profileResponseData, error: profileError } = await supabase
              .from('user_profiles')
              .select('birthday, social_links, description, role') // Запрашиваем роль
              .eq('user_id', user.id)
              .maybeSingle();

          if (profileError) {
              console.error("[ProfilePage] Ошибка загрузки данных профиля из БД:", profileError);
              setError((prevError) => prevError ? `${prevError} | Ошибка загрузки доп. данных профиля.` : 'Ошибка загрузки доп. данных профиля.');
          } else {
              console.log('[ProfilePage] Получены данные профиля из БД:', profileResponseData);
              setProfileData(profileResponseData);
          }

      } catch (fetchError) {
          console.error('[ProfilePage] Критическая ошибка при fetch данных:', fetchError);
          setError(`Критическая ошибка загрузки: ${fetchError.message}.`);
      } finally {
          setLoadingProfile(false); 
      }
  }, [user, supabase, twitchUserId, isAuthenticated]);

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
  const profileDescription = profileData?.description;
  const profileSocialLinks = profileData?.social_links; // Теперь это объект { vk: "...", twitch: "..." }
  const userRole = profileData?.role; // Получаем роль из данных профиля

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
         <div className={styles.actionButtons}> { /* Контейнер для кнопок действий */}
            {/* Кнопка Достижения */}
            <button 
                onClick={() => router.push('/achievements')} 
                className={styles.actionButton} 
                title="Посмотреть достижения"
            >
                 🏆 Достижения
            </button>
             {/* Кнопка Редактировать профиль */}
            <button onClick={() => router.push('/edit-profile')} className={styles.editButton}>
               Редактировать профиль
            </button>
         </div>
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
              {/* Роль пользователя */} 
              {userRole && <span className={styles.userRole}>{userRole === 'streamer' ? 'Стример' : 'Зритель'}</span>}
              <div className={styles.profileStats}>
                {followersCount !== undefined && <span className={styles.statItem}>👥 Фолловеры: {followersCount.toLocaleString('ru-RU')}</span>}
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

      {/* --- Ссылки на соцсети --- */}
      {/* Проверяем, что profileSocialLinks существует и это не пустой объект */} 
      {profileSocialLinks && typeof profileSocialLinks === 'object' && Object.keys(profileSocialLinks).length > 0 && (
          <div className={styles.profileContent}>
            <h2>Социальные сети</h2>
            {loadingProfile ? (
                <div className={styles.skeletonSection}>
                   <div className={`${styles.skeletonText} ${styles.skeleton}`}></div>
                   <div className={`${styles.skeletonText} ${styles.skeleton.short}`}></div>
                </div>
            ) : (
               <div className={styles.socialLinksContainer}> {/* Обертка для кнопок */} 
                 {/* Перебираем ключи объекта social_links и рендерим кнопки */} 
                 {Object.entries(profileSocialLinks)
                   .filter(([, url]) => url) // Показываем только если URL не пустой
                   .map(([platform, url]) => (
                     // Используем новый компонент
                     <StyledSocialButton key={platform} platform={platform} url={url} />
                   ))}
               </div>
            )}
          </div>
      )}

      {/* --- Записи трансляций (VODs) --- */}
       {(videos && videos.length > 0) || loadingProfile ? (
          <div className={styles.profileContent}>
            <h2>Записи трансляций</h2>
            {loadingProfile ? (
                 <div className={styles.skeletonSection}>
                    {/* Скелет для видео */} 
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className={styles.skeletonVod}>
                             <div className={`${styles.skeletonVodThumbnail} ${styles.skeleton}`}></div>
                             <div className={styles.skeletonVodInfo}>
                                 <div className={`${styles.skeletonText} ${styles.skeleton}`}></div>
                                 <div className={`${styles.skeletonText} ${styles.skeleton.short}`}></div>
                             </div>
                        </div>
                    ))}
                 </div>
            ) : (
               <div className={styles.vodsContainer}> 
                 {videos.map((video) => (
                   <Link key={video.id} href={video.url} target="_blank" rel="noopener noreferrer" className={styles.vodCard}>
                     <img 
                       src={video.thumbnail_url?.replace('%{width}', '320').replace('%{height}', '180') || '/images/default_thumbnail.png'} 
                       alt={video.title} 
                       className={styles.vodThumbnail}
                       width={320} // Указываем размеры для оптимизации
                       height={180}
                       loading="lazy" // Ленивая загрузка для превью
                     />
                     <div className={styles.vodInfo}>
                       <h4 className={styles.vodTitle}>{video.title}</h4>
                       <div className={styles.vodMeta}>
                          <span title={`Просмотры: ${video.view_count.toLocaleString('ru-RU')}`}>👁️ {video.view_count.toLocaleString('ru-RU')}</span>
                          <span>🕒 {formatDuration(video.duration)}</span>
                          <span>📅 {formatDate(video.created_at)}</span>
                       </div>
                     </div>
                   </Link>
                 ))}
               </div>
            )}
          </div>
       ) : null /* Не показываем секцию, если нет видео и не идет загрузка */}

    </div>
  );
}

export default ProfilePage; 