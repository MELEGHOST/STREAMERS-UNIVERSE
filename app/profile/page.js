'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
// import Link from 'next/link'; // НЕ ИСПОЛЬЗУЕТСЯ
import CyberAvatar from '../components/CyberAvatar';
import styles from './profile.module.css';
import { useAuth } from '../contexts/AuthContext';
// import SocialLinkButton from '../components/SocialLinkButton/SocialLinkButton'; // <<< Удаляем старый импорт
import StyledSocialButton from '../components/StyledSocialButton/StyledSocialButton';
import Image from 'next/image'; // <<< Добавляем Image

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
  const broadcasterType = twitchUserData?.broadcaster_type;

  // Функция форматирования даты
  const formatDate = (dateString) => {
    if (!dateString) return 'Неизвестно';
    try {
      return new Date(dateString).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return 'Неверная дата'; }
  };

  // --- Функция выхода ---
  const handleLogout = async () => {
      if (!supabase) {
          console.error("[ProfilePage] Supabase client не доступен для выхода.");
          alert("Ошибка: Не удалось выполнить выход.");
          return;
      }
      console.log("[ProfilePage] Выполнение выхода...");
      try {
      const { error } = await supabase.auth.signOut();
      if (error) {
              throw error;
          }
          console.log("[ProfilePage] Выход выполнен успешно. Редирект должен произойти через AuthContext.");
          // Редирект не нужен здесь, т.к. onAuthStateChange в AuthContext должен сработать
          // router.push('/auth?message=Вы+успешно+вышли'); 
      } catch (error) {
          console.error("[ProfilePage] Ошибка при выходе:", error);
          alert(`Ошибка при выходе: ${error.message}`);
      }
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
    // Если не авторизован, отправляем на ГЛАВНУЮ страницу
    console.log('[OldProfileRedirect] Not authenticated, redirecting to /');
    router.replace('/?message=Please+login+to+view+your+profile&next=/profile');
  } else if (user?.user_metadata?.provider_id) {
    // ...
  } else {
    // ...
    router.replace('/menu?error=missing_twitch_id'); 
  }

  return (
    <div className={styles.container}>
       <div className={styles.topBar}>
         <button onClick={() => router.push('/menu')} className={styles.backButton}>
           &larr; Назад в меню
            </button>
         <div className={styles.actionButtons}> { /* Контейнер для кнопок действий */}
            {/* Кнопка Админ панель (только для админов) */}
            {userRole === 'admin' && (
                 <button 
                     onClick={() => router.push('/admin/reviews')} 
                     className={`${styles.actionButton} ${styles.adminButton}`} // Используем общие и админские стили
                     title="Перейти в панель модерации отзывов"
                 >
                     🛡️ Админ панель
                 </button>
             )}
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
            {/* Кнопка Выйти */} 
             <button 
                 onClick={handleLogout} 
                 className={`${styles.actionButton} ${styles.logoutButton}`} /* Добавляем класс для возможных стилей */
                 title="Выйти из аккаунта"
             >
                 🚪 Выйти
            </button>
          </div>
        </div>
        
      {error && <p className={styles.errorMessage}>{error}</p>}

      {loadingProfile && !twitchUserData ? (
             <div className={styles.loadingContainer}><div className="spinner"></div><p>Загрузка...</p></div>
         ) : (
            <div className={styles.profileHeader}>
                <CyberAvatar src={avatarUrl} alt={`Аватар ${displayName}`} size={100} />
                <div className={styles.profileInfo}>
                    <h1 className={styles.displayName}>
                        {/* Добавляем значок админа перед именем */} 
                        {userRole === 'admin' && <span className={styles.adminBadge} title="Администратор">🛡️</span>}
                        {displayName}
                    </h1>
                    {/* Отображаем роль и тип канала */}
                    <p className={styles.metaInfo}>
                       {userRole && <span className={styles.roleBadge}>{userRole}</span>} 
                       <span>{translateBroadcasterType(broadcasterType)}</span>
                       {createdAt && <span> | На Twitch с {formatDate(createdAt)}</span>}
                    </p>
                     {/* Отображаем просмотры и фолловеров */}
                     {(typeof viewCount !== 'undefined' || typeof followersCount !== 'undefined') && (
                         <p className={styles.stats}>
                            {typeof viewCount !== 'undefined' && 
                                <span>👁️ Просмотры: {viewCount.toLocaleString('ru-RU')}</span>
                             }
                             {typeof followersCount !== 'undefined' && 
                                <span> | ❤️ Фолловеры: {followersCount.toLocaleString('ru-RU')}</span>
                             }
                        </p>
                     )}
                 </div>
          </div>
         )}

        {/* Отображение Дополнительной информации (описание, соцсети) */} 
         {(profileDescription || profileSocialLinks) && !loadingProfile && (
            <div className={styles.additionalInfo}>
                {profileDescription && <p className={styles.description}>{profileDescription}</p>}
                {profileSocialLinks && (
                    <div className={styles.socialLinksContainer}>
                         {/* Используем Object.entries для динамического рендера кнопок */} 
                        {Object.entries(profileSocialLinks).map(([platform, url]) => (
                          url && <StyledSocialButton key={platform} platform={platform} url={url} />
                        ))}
                    </div>
                )}
            </div>
        )}

       {/* Секция с последними видео (VODs) */} 
        {videos && videos.length > 0 && !loadingProfile && (
             <div className={styles.videosSection}>
                 <h2 className={styles.sectionTitle}>Последние видео (VODs)</h2>
                 <div className={styles.videosGrid}>
                     {videos.map(video => (
                         <a key={video.id} href={video.url} target="_blank" rel="noopener noreferrer" className={styles.videoCard}>
                             <Image
                                 src={video.thumbnail_url.replace('%{width}', '320').replace('%{height}', '180')}
                                 alt={`Превью видео ${video.title}`}
                                 width={320}
                                 height={180}
                                 className={styles.videoThumbnail}
                                 unoptimized
                             />
                             <div className={styles.videoInfo}>
                                 <h3 className={styles.videoTitle} title={video.title}>{video.title}</h3>
                                 <p className={styles.videoMeta}>
                                     <span>{formatDate(video.created_at)}</span>
                                     <span> | {formatDuration(video.duration)}</span>
                                     <span> | 👁️ {video.view_count.toLocaleString('ru-RU')}</span>
                  </p>
                </div>
                         </a>
                     ))}
              </div>
            </div>
         )}

    </div>
  );
} 

export default ProfilePage; 