'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
// import Link from 'next/link'; // НЕ ИСПОЛЬЗУЕТСЯ
import Image from 'next/image';
import CyberAvatar from '../../components/CyberAvatar';
import styles from '../profile.module.css';
import pageStyles from '../../../styles/page.module.css';
import { useAuth } from '../../contexts/AuthContext';
import StyledSocialButton from '../../components/StyledSocialButton/StyledSocialButton';

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
  const [followersCount, setFollowersCount] = useState(undefined);
  const [videos, setVideos] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState(null);

  const loadProfileData = useCallback(async () => {
    console.log(`[UserProfilePage] Загрузка данных для twitchId: ${profileTwitchId}`);
    setLoadingProfile(true);
    setError(null);

    try {
        // <<< Получаем токен ДО запроса fetch >>>
        let authToken = null;
        if (isAuthenticated && supabase) { // Проверяем и isAuthenticated, и наличие supabase
            try {
                const session = await supabase.auth.getSession();
                authToken = session.data.session?.access_token;
            } catch (sessionError) {
                console.error("[UserProfilePage] Ошибка получения сессии:", sessionError);
                // Не прерываем, попробуем загрузить публичные данные
            }
        }

        // <<< Формируем заголовки >>>
        const headers = {};
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        // <<< Выполняем fetch с новыми заголовками >>>
        const response = await fetch(`/api/twitch/user?userId=${profileTwitchId}&fetchProfile=true`, {
            headers: headers // Передаем собранные заголовки
        });

        if (!response.ok) {
             if (response.status === 404) {
                  setError("Пользователь Twitch не найден.");
                  setProfileExists(false);
             } else {
                 const errorText = await response.text();
                 const errorMsg = `Ошибка API /api/twitch/user (${response.status}): ${errorText}`;
                 console.error(`[UserProfilePage] ${errorMsg}`);
                 setError(`Не удалось загрузить свежие данные (${response.status}). Попробуйте позже.`);
             }
             setLoadingProfile(false);
        } else {
            const data = await response.json();
            console.log('[UserProfilePage] Получены свежие данные от API:', data);

            setTwitchUserData(data.twitch_user || null);
            setFollowersCount(data.twitch_user?.followers_count);
            setVideos(data.twitch_user?.videos || []);
            setProfileData(data.profile || null);
            setIsRegistered(!!data.profile);
            setProfileExists(true);
            setError(null);
            setLoadingProfile(false);

            // Убедимся, что запись в localStorage закомментирована
            /* localStorage.setItem ... */
        }

    } catch (fetchError) {
        console.error('[UserProfilePage] Критическая ошибка при fetch данных:', fetchError);
        setError(`Критическая ошибка загрузки: ${fetchError.message}.`);
        setLoadingProfile(false);
    }
  }, [profileTwitchId, isAuthenticated, supabase]);

  useEffect(() => {
      loadProfileData();
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

  const displayName = twitchUserData?.display_name || 'Неизвестно';
  const avatarUrl = twitchUserData?.profile_image_url;
  const viewCount = twitchUserData?.view_count;
  const createdAt = twitchUserData?.created_at;
  const broadcasterType = twitchUserData?.broadcaster_type;
  const profileDescription = profileData?.description;
  const profileSocialLinks = profileData?.social_links;
  const userRole = profileData?.role;

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
                  {createdAt && <span> | На Twitch с {formatDate(createdAt)}</span>}
              </p>
              {(typeof viewCount === 'number' || typeof followersCount === 'number') && (
                  <p className={styles.stats}>
                      {typeof viewCount === 'number' && <span>👁️ Просмотры: {viewCount.toLocaleString('ru-RU')}</span>}
                      {(typeof viewCount === 'number' && typeof followersCount === 'number') && ' | '}
                      {typeof followersCount === 'number' && <span>❤️ Фолловеры: {followersCount.toLocaleString('ru-RU')}</span>}
                  </p>
              )}
               {isRegistered === false && <p className={styles.notRegisteredHint}>Этот пользователь еще не присоединился к Streamers Universe.</p>}
          </div>
      </div>

      {isRegistered && (profileDescription || profileSocialLinks) && (
          <div className={styles.additionalInfo}>
              {profileDescription && <p className={styles.description}>{profileDescription}</p>}
              {profileSocialLinks && (
                  <div className={styles.socialLinksContainer}>
                      {Object.entries(profileSocialLinks).map(([platform, url]) => (
                          url && <StyledSocialButton key={platform} platform={platform} url={url} />
                      ))}
                  </div>
              )}
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