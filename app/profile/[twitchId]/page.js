'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
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

  const { user, isLoading: authLoading, isAuthenticated, supabase } = useAuth();
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
    if (!profileTwitchId) {
      setError("Не указан Twitch ID пользователя.");
      setLoadingProfile(false);
      setProfileExists(false);
      return;
    }

    console.log(`[UserProfilePage] Загрузка данных для twitchId: ${profileTwitchId}`);
    setLoadingProfile(true);
    setError(null);
    let isRegisteredCheck = false;

    try {
        const cacheKey = `profile_data_${profileTwitchId}`;
        let cachedData = null;
        if (typeof window !== 'undefined') {
            const cachedStr = localStorage.getItem(cacheKey);
            if (cachedStr) {
                try {
                    cachedData = JSON.parse(cachedStr);
                    console.log('[UserProfilePage] Используются кэшированные данные', cachedData);
                    setTwitchUserData(cachedData.twitch_user);
                    setFollowersCount(cachedData.twitch_user.followers_count);
                    setVideos(cachedData.twitch_user.videos || []);
                    setProfileData(cachedData.profile);
                    setIsRegistered(!!cachedData.profile);
                    setProfileExists(true);
                    setLoadingProfile(false);
                 } catch (err) {
                     console.warn('[UserProfilePage] Ошибка парсинга кэша, удаляем:', err.message);
                     localStorage.removeItem(cacheKey);
                 }
            }
        }

        const response = await fetch(`/api/twitch/user?userId=${profileTwitchId}&fetchProfile=true`, {
            headers: {
                ...(isAuthenticated && { 'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}` })
            }
        });

        if (!response.ok) {
             if (response.status === 404) {
                  setError("Пользователь Twitch не найден.");
                  setProfileExists(false);
                  if (typeof window !== 'undefined') localStorage.removeItem(cacheKey);
             } else {
                 const errorText = await response.text();
                 const errorMsg = `Ошибка API /api/twitch/user (${response.status}): ${errorText}`;
                 console.error(`[UserProfilePage] ${errorMsg}`);
                 setError(`Не удалось загрузить свежие данные (${response.status}). ${cachedData ? 'Используются кэшированные.': 'Попробуйте позже.'}`);
             }
        } else {
            const data = await response.json();
            console.log('[UserProfilePage] Получены свежие данные от API:', data);

            if (!data || !data.twitch_user) { 
                 setError("Не удалось получить данные от Twitch.");
                 setProfileExists(false);
                 if (typeof window !== 'undefined') localStorage.removeItem(cacheKey);
                 setLoadingProfile(false);
                 return;
            }
            
            setTwitchUserData(data.twitch_user);
            setFollowersCount(data.twitch_user.followers_count);
            setVideos(data.twitch_user.videos || []);
            setProfileData(data.profile);
            setIsRegistered(!!data.profile);
            setProfileExists(true);
            setError(null);

            if (typeof window !== 'undefined') {
                 try {
                      localStorage.setItem(cacheKey, JSON.stringify(data));
                      console.log('[UserProfilePage] Кэш обновлен.');
                 } catch (e) {
                      console.error('[UserProfilePage] Ошибка сохранения кэша:', e);
                 }
             }
        }

    } catch (fetchError) {
        console.error('[UserProfilePage] Критическая ошибка при fetch данных:', fetchError);
        setError(`Критическая ошибка загрузки: ${fetchError.message}. ${cachedData ? 'Используются кэшированные.': ''}`);
    } finally {
         if (!cachedData) {
             setLoadingProfile(false);
         }
        if (typeof isRegistered === 'undefined') {
             setIsRegistered(isRegisteredCheck);
        }
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

  const displayName = twitchUserData?.display_name || 'Загрузка...';
  const avatarUrl = twitchUserData?.profile_image_url || '/images/default_avatar.png';
  const viewCount = twitchUserData?.view_count;
  const createdAt = twitchUserData?.created_at;
  const profileDescription = profileData?.description;
  const profileSocialLinks = profileData?.social_links;
  const userRole = profileData?.role;
  const broadcasterType = twitchUserData?.broadcaster_type;

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

  if (loadingProfile) {
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
              {(typeof viewCount !== 'undefined' || typeof followersCount !== 'undefined') && (
                  <p className={styles.stats}>
                      {typeof viewCount !== 'undefined' && <span>👁️ Просмотры: {viewCount.toLocaleString('ru-RU')}</span>}
                      {typeof followersCount !== 'undefined' && <span> | ❤️ Фолловеры: {followersCount.toLocaleString('ru-RU')}</span>}
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