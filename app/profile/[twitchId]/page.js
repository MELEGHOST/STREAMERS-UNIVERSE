'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
// import Link from 'next/link'; // НЕ ИСПОЛЬЗУЕТСЯ
import Image from 'next/image';
import CyberAvatar from '../../components/CyberAvatar';
import styles from '../profile.module.css';
import pageStyles from '../../../styles/page.module.css';
import { useAuth } from '../../contexts/AuthContext';
// Возвращаем StyledSocialButton
import StyledSocialButton from '../../components/StyledSocialButton/StyledSocialButton';
import { FaVk, FaYoutube, FaTiktok } from 'react-icons/fa'; // Убрали Twitch, Discord
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

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const profileTwitchId = params.twitchId;

  const { user, isAuthenticated, supabase } = useAuth();
  const currentUserTwitchId = user?.user_metadata?.provider_id;
  const isOwnProfile = currentUserTwitchId === profileTwitchId;

  const [profileExists, setProfileExists] = useState(true);
  const [isRegistered, setIsRegistered] = useState(undefined);
  const [twitchUserData, setTwitchUserData] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState(null);

  const loadProfileData = useCallback(async () => {
    console.log(`[UserProfilePage] Загрузка данных для twitchId: ${profileTwitchId}`);
    let result = { data: null, error: null, exists: true };

    try {
        let authToken = null;
        if (isAuthenticated && supabase) {
            try {
                const session = await supabase.auth.getSession();
                authToken = session.data.session?.access_token;
            } catch (sessionError) {
                console.error("[UserProfilePage] Ошибка получения сессии:", sessionError);
            }
        }

        const headers = {};
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`/api/twitch/user?userId=${profileTwitchId}&fetchProfile=true`, { headers });

        if (!response.ok) {
            result.exists = response.status !== 404;
            const errorText = await response.text();
            const errorMsg = `Ошибка API /api/twitch/user (${response.status}): ${errorText || response.statusText}`;
            console.error(`[UserProfilePage] ${errorMsg}`);
            result.error = `Не удалось загрузить данные (${response.status}). Попробуйте позже.`;
        } else {
            result.data = await response.json();
            console.log('[UserProfilePage] Получены свежие данные от API:', result.data);
            result.exists = !!result.data?.twitch_user;
        }

    } catch (fetchError) {
        console.error('[UserProfilePage] Критическая ошибка при fetch данных:', fetchError);
        result.error = `Критическая ошибка загрузки: ${fetchError.message}.`;
        result.exists = false;
    }
    return result;
  }, [profileTwitchId, isAuthenticated, supabase]);

  useEffect(() => {
      let isMounted = true;
      setLoadingProfile(true);
      
      loadProfileData().then(result => {
          if (!isMounted) return;
          console.log('[UserProfilePage] Обработка результата loadProfileData', result);
          
          if (result.error) {
              setError(result.error);
          }
          if (!result.exists) {
              setProfileExists(false);
          } else if (result.data) {
              setTwitchUserData(result.data.twitch_user || null);
              setVideos(result.data.twitch_user?.videos || []);
              setProfileData(result.data.profile || null);
              setIsRegistered(!!result.data.profile);
              setProfileExists(true);
              setError(null);
          }
          setLoadingProfile(false);
          
          console.log('[UserProfilePage] States after update:', {
              loadingProfile: false,
              profileExists: result.exists,
              isRegistered: !!result.data?.profile,
              twitchUserData: result.data?.twitch_user,
              profileData: result.data?.profile,
              error: result.error
          });
      });
      
      return () => { isMounted = false; };
  }, [loadProfileData]);

  const handleLogout = async () => {
       if (!supabase) return;
       try {
           await supabase.auth.signOut();
       } catch (error) { console.error('Logout error:', error); }
   };

  const renderProfileActionButton = () => {
      if (isOwnProfile) {
          return (
             <button onClick={() => router.push('/edit-profile')} className={styles.editButton}>
                Редактировать профиль
             </button>
          );
      } else if (isRegistered === false && twitchUserData?.login) {
          return (
              <a 
                 href={`https://twitch.tv/${twitchUserData.login}`} 
                 target="_blank" 
                 rel="noopener noreferrer" 
                 className={`${styles.actionButton} ${styles.inviteButton}`}
              >
                  <span className={styles.icon}>👋</span> Пригласить в Universe
             </a>
          );
      } 
      return null; 
  };

  console.log('[UserProfilePage] Rendering with states:', {
      loadingProfile,
      profileExists,
      isRegistered,
      twitchUserData: !!twitchUserData,
      profileData: !!profileData,
      error
  });

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
  const followersCount = profileData?.twitch_follower_count ?? twitchUserData?.followers_count;
  const createdAt = twitchUserData?.created_at;
  const broadcasterType = twitchUserData?.broadcaster_type || profileData?.twitch_broadcaster_type;
  const profileDescription = profileData?.description;
  const profileSocialLinks = profileData?.social_links;
  const userRole = profileData?.role;
  const formattedDate = createdAt ? formatDate(createdAt) : 'Неизвестно';

  return (
    <div className={styles.container}> 
      <div className={styles.topBar}>
          <button onClick={() => router.back()} className={styles.backButton}>
              &larr; Назад
          </button>
          <div className={styles.actionButtons}>
              {isOwnProfile && userRole === 'admin' && (
                   <button onClick={() => router.push('/admin/reviews')} className={`${styles.actionButton} ${styles.adminButton}`} title="Модерация">
                       🛡️ Админ панель
                   </button>
               )}
              {isOwnProfile && (
                   <button onClick={() => router.push('/my-reviews')} className={`${styles.actionButton} ${styles.myReviewsButton}`} title="Мои отзывы">
                       📝 Мои отзывы
                   </button>
               )}
              {isOwnProfile && (
                   <button onClick={() => router.push('/achievements')} className={styles.actionButton} title="Достижения">
                       🏆 Достижения
                   </button>
               )}
              {renderProfileActionButton()}
              {isOwnProfile && (
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
               {isRegistered === false && <p className={styles.notRegisteredHint}>Этот пользователь еще не присоединился к Streamers Universe.</p>}
          </div>
      </div>

      {/* Описание профиля */}
      {profileDescription && (
          <div className={styles.descriptionSection}>
              <h2>Описание</h2>
              <p>{profileDescription}</p>
          </div>
      )}

      {/* --- Блок Социальные сети --- */}
      {profileSocialLinks && Object.keys(profileSocialLinks).length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Социальные сети</h2>
          <div className={styles.socialLinksContainer}> {/* Новый контейнер для кнопок */} 
            {Object.entries(profileSocialLinks).map(([key, value]) => {
              if (!value) return null; // Пропускаем пустые ссылки
              
              // Определение компонента иконки/кнопки
              let SocialComponent = null;
              let iconProps = { size: 28 }; // Базовый размер для react-icons
              let specificClassName = styles.socialIconGeneric; // Общий класс

              switch (key.toLowerCase()) {
                case 'vk':
                  SocialComponent = FaVk;
                  specificClassName = styles.socialIconVk;
                  break;
                case 'youtube':
                  SocialComponent = FaYoutube;
                   specificClassName = styles.socialIconYoutube;
                  break;
                 case 'tiktok':
                   SocialComponent = FaTiktok;
                   specificClassName = styles.socialIconTiktok;
                   break;
                 case 'discord':
                   // Используем новый компонент DiscordButton
                   return <DiscordButton key={key} url={value} />;
                 case 'telegram':
                     // Используем новый компонент TelegramButton
                     return <TelegramButton key={key} url={value} />;
                 case 'boosty':
                    SocialComponent = SiBoosty;
                    specificClassName = styles.socialIconBoosty;
                    iconProps = { size: 24 }; // Иконка Boosty может быть меньше
                    break;
                // Добавить другие кейсы по необходимости
                default:
                  // Можно вернуть заглушку или просто пропустить
                  console.warn(`[UserProfilePage] Unknown social link key: ${key}`);
                  return null; 
              }
              
              // Рендерим старый StyledSocialButton для остальных иконок
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
      {/* --- Конец блока Социальные сети --- */}

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