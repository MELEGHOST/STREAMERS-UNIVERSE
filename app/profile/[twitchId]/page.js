'use client';

import { useState, useEffect /*, useCallback */ } from 'react';
import { useRouter, useParams } from 'next/navigation';
import useSWR from 'swr';
// import Link from 'next/link'; // НЕ ИСПОЛЬЗУЕТСЯ
import Image from 'next/image';
import CyberAvatar from '../../components/CyberAvatar';
import styles from '../profile.module.css';
import pageStyles from '../../../styles/page.module.css';
import { useAuth } from '../../contexts/AuthContext';
// Возвращаем StyledSocialButton
import StyledSocialButton from '../../components/StyledSocialButton/StyledSocialButton';
import { FaYoutube, FaTiktok } from 'react-icons/fa'; // Убрали Twitch, Discord
import { SiBoosty } from "react-icons/si"; // Иконка для Boosty
import DiscordButton from '../../components/SocialButtons/DiscordButton'; // Импорт новой кнопки Discord
import TelegramButton from '../../components/SocialButtons/TelegramButton'; // Импорт новой кнопки Telegram

const translateBroadcasterType = (type) => {
  switch (type) {
    case 'affiliate': return 'Компаньон';
    case 'partner': return 'Партнёр';
    case '': return 'Обычный';
    default: return type || 'Неизвестно';
  }
};

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
  if (seconds > 0 || totalSeconds === 0) formatted += `${seconds}s`;
  return formatted.trim() || '0s';
};

const formatDate = (dateString) => {
  if (!dateString) return 'Неизвестно';
  try {
    return new Date(dateString).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return 'Неверная дата'; }
};

// --- Фетчер для SWR ---
const fetcher = async (url, token) => {
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(url, { headers });

    if (!res.ok) {
        const errorInfo = {
            status: res.status,
            message: `Ошибка API (${res.status}): ${await res.text() || res.statusText}`,
            exists: res.status !== 404
        };
        console.error(`[SWR fetcher] ${errorInfo.message}`);
        throw errorInfo; // SWR будет ловить это в error
    }
    return res.json(); // Возвращаем данные
};

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const profileTwitchId = params.twitchId;

  const { user, isAuthenticated, supabase, isLoading: authIsLoading } = useAuth();
  const currentUserTwitchId = user?.user_metadata?.provider_id;
  const isOwnProfile = currentUserTwitchId === profileTwitchId;

  // --- Получаем токен для запроса --- 
  const [authToken, setAuthToken] = useState(null);
  useEffect(() => {
      const getToken = async () => {
          if (isAuthenticated && supabase) {
              try {
                  const session = await supabase.auth.getSession();
                  setAuthToken(session.data.session?.access_token || null);
              } catch (sessionError) {
                  console.error("[UserProfilePage] Ошибка получения сессии для SWR:", sessionError);
                  setAuthToken(null);
              }
          } else {
              setAuthToken(null);
          }
      };
      if (!authIsLoading) {
         getToken();
      }
  }, [isAuthenticated, supabase, authIsLoading]);

  // --- Запрос данных через SWR ---
  const apiUrl = `/api/twitch/user?userId=${profileTwitchId}&fetchProfile=true`;
  const { data: apiData, error: apiError, isLoading: dataIsLoading } = useSWR(
      // Ключ SWR: сам URL. Запрос будет выполняться только если profileTwitchId есть.
      profileTwitchId ? [apiUrl, authToken] : null, 
      ([url, token]) => fetcher(url, token), // Используем наш фетчер
      {
          revalidateOnFocus: true, // <<< Магия! Авто-обновление при фокусе окна
          revalidateOnReconnect: true, // Авто-обновление при реконнекте
          shouldRetryOnError: false, // Не повторять при ошибке (чтобы не спамить запросами)
          onError: (err) => {
              console.error('[useSWR onError]', err);
          },
          onSuccess: (data) => {
              console.log('[useSWR onSuccess] Data received:', data);
          }
      }
  );
  
  // --- Обработка состояния загрузки и ошибок SWR ---
  const loadingProfile = authIsLoading || dataIsLoading;
  const error = apiError ? (apiError.message || "Неизвестная ошибка загрузки данных") : null;
  const profileExists = apiError ? apiError.exists !== false : !!apiData?.twitch_user;
  
  // --- Извлекаем данные из ответа SWR ---
  const twitchUserData = apiData?.twitch_user || null;
  const profileData = apiData?.profile || null;
  const videos = apiData?.twitch_user?.videos || [];
  const isRegistered = !!profileData; // Определяем регистрацию по наличию профиля из нашей БД

  console.log('[UserProfilePage] Rendering with SWR states:', {
      loadingProfile,
      profileExists,
      isRegistered,
      twitchUserData: !!twitchUserData,
      profileData: !!profileData,
      error: error
  });

  const handleLogout = async () => {
       if (!supabase) return;
       try {
           await supabase.auth.signOut();
           console.log('[UserProfilePage] Logout successful, redirecting to /auth...');
           router.push('/auth'); // <<< Редирект на страницу входа
           router.refresh(); // <<< Дополнительно обновляем страницу, чтобы сбросить состояние
       } catch (error) { 
           console.error('Logout error:', error);
           // TODO: Показать пользователю сообщение об ошибке выхода?
       }
   };

  if (loadingProfile) {
      console.log('[UserProfilePage] Rendering loading state...');
      return (
          <div className={pageStyles.loadingContainer}> 
              <div className="spinner"></div>
              <p>Загрузка профиля...</p>
          </div>
      );
  }

  if (!profileExists) {
       return (
           <div className={pageStyles.container}> 
              <h1 style={{ textAlign: 'center' }}>Профиль не найден</h1>
               <p className={pageStyles.errorMessage}>{error || "Пользователь с таким Twitch ID не найден."}</p>
               <button onClick={() => router.push('/menu')} className={pageStyles.backButton} style={{ display: 'block', margin: '2rem auto' }}>
                   &larr; Назад в меню
               </button>
           </div>
       );
  }

  const displayName = twitchUserData?.display_name || profileData?.twitch_display_name || 'Неизвестно';
  const avatarUrl = twitchUserData?.profile_image_url || profileData?.twitch_profile_image_url;
  const viewCount = twitchUserData?.view_count;
  const followersCount = twitchUserData?.followers_count ?? profileData?.twitch_follower_count;
  const createdAt = twitchUserData?.created_at;
  const broadcasterType = twitchUserData?.broadcaster_type || profileData?.twitch_broadcaster_type;
  const profileDescription = isRegistered ? profileData?.description : twitchUserData?.description;
  const profileSocialLinks = isRegistered ? profileData?.social_links : null;
  const userRole = isRegistered ? profileData?.role : null;
  const formattedDate = createdAt ? formatDate(createdAt) : 'Неизвестно';

  const handleInvite = async () => {
    if (!currentUserTwitchId) {
        alert('Не удалось получить ваш Twitch ID для создания ссылки-приглашения.');
        return;
    }
    const inviteUrl = `${window.location.origin}/auth?ref=${currentUserTwitchId}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      alert(`Ссылка-приглашение для ${displayName} скопирована в буфер обмена!\n${inviteUrl}`);
    } catch (err) {
      console.error('Ошибка копирования в буфер обмена:', err);
      alert('Не удалось скопировать ссылку. Попробуйте скопировать ее вручную из консоли.');
      console.log('Ссылка для приглашения:', inviteUrl);
    }
  };

  return (
    <div className={styles.container}> 
      <div className={styles.topBar}>
          <button onClick={() => router.back()} className={styles.backButton}>
              &larr; Назад
          </button>
          <div className={styles.actionButtons}>
              {isOwnProfile && isRegistered && userRole === 'admin' && (
                   <button onClick={() => router.push('/admin/reviews')} className={`${styles.actionButton} ${styles.adminButton}`} title="Модерация">
                       🛡️ Админ панель
                   </button>
               )}
              {isOwnProfile && isRegistered && (
                   <button onClick={() => router.push('/my-reviews')} className={`${styles.actionButton} ${styles.myReviewsButton}`} title="Мои отзывы">
                       📝 Мои отзывы
                   </button>
               )}
              {isOwnProfile && isRegistered && (
                   <button onClick={() => router.push('/achievements')} className={styles.actionButton} title="Достижения">
                       🏆 Достижения
                   </button>
               )}
               {isOwnProfile && isRegistered ? (
                    <button onClick={() => router.push('/edit-profile')} className={styles.editButton}>
                       Редактировать профиль
                    </button>
               ) : !isOwnProfile && isRegistered === false ? (
                    <button onClick={handleInvite} className={`${styles.actionButton} ${styles.inviteButton}`}>
                         <span className={styles.icon}>👋</span> Пригласить в Universe
                    </button>
               ) : null}
               {isOwnProfile && isRegistered && (
                   <button onClick={handleLogout} className={`${styles.actionButton} ${styles.logoutButton}`} title="Выйти">
                       🚪 Выйти
                   </button>
               )}
          </div>
      </div>

      {error && <p className={styles.errorMessage}>{error}</p>}

      <div className={styles.profileHeader}>
          <CyberAvatar src={avatarUrl} alt={`Аватар ${displayName}`} size={100} />
          <div className={styles.profileInfo}>
              <h1 className={styles.displayName}>
                  {isRegistered && userRole === 'admin' && <span className={styles.adminBadge} title="Администратор">🛡️</span>}
                  {displayName}
              </h1>
              <p className={styles.metaInfo}>
                  {isRegistered && userRole && <span className={styles.roleBadge}>{userRole}</span>} 
                  <span>{translateBroadcasterType(broadcasterType)}</span>
                  {createdAt && <span> | На Twitch с {formattedDate}</span>}
              </p>
              <p className={styles.stats}>
                  {typeof viewCount === 'number' && 
                      <span>👁️ Просмотры: {viewCount.toLocaleString('ru-RU')}</span>
                  }
                  {(typeof viewCount === 'number' && typeof followersCount === 'number' && followersCount >= 0) && ' | '}
                  {(typeof followersCount === 'number' && followersCount >= 0) && 
                      <span>❤️ Фолловеры: {followersCount.toLocaleString('ru-RU')}</span>
                  }
              </p>
               {/* Плашка "не зареган" показывается ТОЛЬКО для ЧУЖИХ профилей */}
               {!isOwnProfile && isRegistered === false && 
                   <p className={styles.notRegisteredHint}>Этот пользователь еще не присоединился к Streamers Universe.</p>
               }
          </div>
      </div>

      {(profileDescription || (isRegistered === false && twitchUserData?.description)) && (
          <div className={styles.descriptionSection}>
              <h2>Описание</h2>
              <p>{isRegistered ? profileDescription : twitchUserData?.description}</p>
          </div>
      )}

      {isRegistered && profileSocialLinks && Object.keys(profileSocialLinks).length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Социальные сети</h2>
          <div className={styles.socialLinksContainer}>
            {Object.entries(profileSocialLinks).map(([key, value]) => {
              if (!value) return null;
              
              let SocialComponent = null;
              let iconProps = { size: 28 };
              let specificClassName = styles.socialIconGeneric;

              switch (key.toLowerCase()) {
                case 'vk':
                  // Заменяем FaVk на SVG
                  // SocialComponent = FaVk; // Убрали
                  // specificClassName = styles.socialIconVk; // Убрали, стили будут внутри SVG или общие
                  return (
                      <StyledSocialButton
                          key={key}
                          href={value}
                          network={key}
                          aria-label={`Профиль в ${key}`}
                          className={`${styles.socialIconLink} ${styles.socialIconVk}`}
                      >
                          <svg fill="currentColor" width="28px" height="28px" viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg">
                              <path d="M0.094 7.75c0-1.188 0.813-1.656 1.813-1.719l4.656 0.031c0.281 0 0.531 0.188 0.625 0.469 1.063 3.438 2.375 5.563 3.938 7.969 0.094 0.188 0.25 0.281 0.406 0.281 0.125 0 0.25-0.063 0.344-0.219l0.094-0.344 0.031-5.406c0-0.781-0.375-0.906-1.25-1.031-0.344-0.063-0.563-0.375-0.563-0.688 0-0.063 0-0.125 0.031-0.188 0.438-1.344 1.813-2.031 3.75-2.031l1.75-0.031c1.438 0 2.75 0.625 2.75 2.469v7.094c0.125 0.094 0.25 0.156 0.406 0.156 0.25 0 0.563-0.156 0.813-0.563 1.625-2.281 3.469-5 3.719-6.438 0-0.063 0.031-0.094 0.063-0.156 0.344-0.688 1.219-1.156 1.594-1.281 0.063-0.031 0.156-0.063 0.281-0.063h4.844l0.313 0.031c0.469 0 0.813 0.313 0.969 0.594 0.281 0.438 0.219 0.906 0.25 1.094v0.219c-0.469 2.844-3.719 6.031-5.094 8.094-0.188 0.25-0.281 0.469-0.281 0.688 0 0.188 0.094 0.375 0.25 0.563l4.563 5.75c0.25 0.344 0.375 0.75 0.375 1.094 0 1.031-0.969 1.625-1.906 1.719l-0.531 0.031h-4.75c-0.094 0-0.156 0.031-0.25 0.031-0.531 0-0.969-0.281-1.281-0.594-1-1.219-1.969-2.469-2.938-3.688-0.188-0.25-0.25-0.281-0.438-0.406-0.219 0.906-0.406 1.844-0.625 2.781l-0.094 0.531c-0.156 0.563-0.563 1.156-1.313 1.313l-0.438 0.031h-3.063c-5.406 0-10.25-7.688-13.656-17.281-0.094-0.25-0.156-0.594-0.156-0.906zM18.875 15.844c-0.813 0-1.719-0.469-1.719-1.344v-7.188c0-0.844-0.375-1.156-1.406-1.156l-1.781 0.063c-1 0-1.563 0.156-2.031 0.469 0.719 0.344 1.375 0.813 1.375 2.125v5.5c-0.094 1.094-1 1.813-1.875 1.813-0.594 0-1.125-0.344-1.438-0.906-1.406-2.125-2.594-4.125-3.625-7l-0.281-0.813-4.156-0.031c-0.563 0-0.5 0.031-0.5 0.313 0 0.188 0.031 0.438 0.063 0.594l0.656 1.75c3.406 8.813 7.688 14.594 11.75 14.594h3.125c0.438 0 0.406-0.531 0.5-0.844l0.594-2.75c0.125-0.281 0.219-0.531 0.438-0.75 0.25-0.25 0.531-0.344 0.813-0.344 0.594 0 1.156 0.469 1.531 0.906l2.656 3.375c0.219 0.344 0.406 0.406 0.531 0.406h5.156c0.5 0 0.938-0.156 0.938-0.469 0-0.094-0.031-0.219-0.094-0.313l-4.531-5.656c-0.375-0.469-0.531-0.938-0.531-1.406 0-0.5 0.188-1 0.5-1.438 1.313-1.969 4.125-4.781 4.781-7.094l0.094-0.406c-0.031-0.156-0.031-0.281-0.063-0.438h-4.906c-0.313 0.125-0.563 0.313-0.75 0.563l-0.188 0.594c-0.719 2-2.688 4.75-4.094 6.656-0.469 0.438-1 0.625-1.531 0.625z"></path>
                          </svg>
                      </StyledSocialButton>
                  );
                case 'youtube':
                  SocialComponent = FaYoutube;
                   specificClassName = styles.socialIconYoutube;
                  break;
                 case 'tiktok':
                   SocialComponent = FaTiktok;
                   specificClassName = styles.socialIconTiktok;
                   break;
                 case 'discord':
                   return <DiscordButton key={key} url={value} />;
                 case 'telegram':
                     return <TelegramButton key={key} url={value} />;
                 case 'boosty':
                    SocialComponent = SiBoosty;
                    specificClassName = styles.socialIconBoosty;
                    iconProps = { size: 24 };
                    break;
                default:
                  console.warn(`[UserProfilePage] Unknown social link key: ${key}`);
                  return null; 
              }
              
              if (SocialComponent) {
                   return (
                       <StyledSocialButton
                           key={key}
                           href={value}
                           network={key}
                           aria-label={`Профиль в ${key}`}
                           className={`${styles.socialIconLink} ${specificClassName}`}
                       >
                           <SocialComponent {...iconProps} />
                       </StyledSocialButton>
                   );
               }
               return null;
            })}
          </div>
        </div>
      )}

      {videos && videos.length > 0 && (
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
                              onError={(e) => { e.target.style.display = 'none'; }} 
                              unoptimized 
                          />
                          <div className={styles.videoInfo}>
                              <h3 className={styles.videoTitle} title={video.title}>{video.title}</h3>
                              <p className={styles.videoMeta}>
                                  <span>{formatDate(video.created_at)}</span>
                                  <span> | {formatDuration(video.duration)}</span>
                                  {typeof video.view_count === 'number' && 
                                     <span> | 👁️ {video.view_count.toLocaleString('ru-RU')}</span>
                                  }
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