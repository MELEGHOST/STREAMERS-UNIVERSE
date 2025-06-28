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
import { pluralize } from '../../utils/pluralize';
// Возвращаем StyledSocialButton
// import StyledSocialButton from '../../components/StyledSocialButton/StyledSocialButton';
// import { FaYoutube, FaTiktok } from 'react-icons/fa'; // Убрали Twitch, Discord
// import { SiBoosty } from "react-icons/si"; // Иконка для Boosty
// import DiscordButton from '../../components/SocialButtons/DiscordButton'; // Импорт новой кнопки Discord
// import TelegramButton from '../../components/SocialButtons/TelegramButton'; // Импорт новой кнопки Telegram

// <<< Импортируем новые компоненты кнопок >>>
import VkButton from '../../components/SocialButtons/VkButton';
import TwitchButton from '../../components/SocialButtons/TwitchButton';
import YoutubeButton from '../../components/SocialButtons/YoutubeButton';
import DiscordButton from '../../components/SocialButtons/DiscordButton';
import TelegramButton from '../../components/SocialButtons/TelegramButton';
import TiktokButton from '../../components/SocialButtons/TiktokButton';
import BoostyButton from '../../components/SocialButtons/BoostyButton';
import YandexMusicButton from '../../components/SocialButtons/YandexMusicButton';

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

  const { user, isAuthenticated, supabase, isLoading: authIsLoading, signOut } = useAuth();
  
  // --- Debug Log: Проверка данных из useAuth ---
  console.log('[UserProfilePage] Auth Context State:', { 
      authIsLoading, 
      isAuthenticated, 
      userId: user?.id, 
      userMeta: user?.user_metadata 
  });

  // Вычисляем isOwnProfile *после* проверки authIsLoading
  const currentUserTwitchId = !authIsLoading ? user?.user_metadata?.provider_id : undefined;
  const isOwnProfile = !authIsLoading && !!currentUserTwitchId && currentUserTwitchId === profileTwitchId;
  
  // --- Debug Log: Проверка вычисления isOwnProfile ---
  console.log('[UserProfilePage] isOwnProfile Calculation:', {
      authIsLoading,
      currentUserTwitchId,
      profileTwitchId,
      comparisonResult: currentUserTwitchId === profileTwitchId,
      final_isOwnProfile: isOwnProfile
  });

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
      profileTwitchId ? [apiUrl, authToken] : null, 
      ([url, token]) => fetcher(url, token),
      {
          revalidateOnFocus: true, 
          revalidateOnReconnect: true,
          shouldRetryOnError: false, 
          onError: (err) => { console.error('[useSWR onError]', err); },
          onSuccess: (data) => { console.log('[useSWR onSuccess] Data received:', data); }
      }
  );
  
  // --- Debug Log: Проверка данных от API ---
  console.log('[UserProfilePage] SWR State:', {
      dataIsLoading,
      apiData,
      apiError
  });

  // --- Обработка состояния загрузки и ошибок SWR ---
  const loadingProfile = (!profileTwitchId || authIsLoading || dataIsLoading);
  const error = apiError ? (apiError.message || "Неизвестная ошибка загрузки данных") : null;
  const profileExists = apiError ? apiError.exists !== false : !!apiData?.twitch_user;
  
  // --- Извлекаем данные из ответа SWR ---
  const twitchUserData = apiData?.twitch_user || null;
  const profileData = apiData?.profile || null;
  const videos = apiData?.twitch_user?.videos || [];
  const isRegistered = !!profileData;

  // --- Получаем роль/роли из профиля --- 
  const userRolesString = isRegistered ? profileData?.role : null;
  const userRolesArray = userRolesString?.split(',').map(role => role.trim().toLowerCase()).filter(Boolean) || [];
  const isAdmin = userRolesArray.includes('admin');

  // --- Debug Log: Финальные данные перед рендером ---
  console.log('[UserProfilePage] Final state before render:', {
      profileTwitchId,
      authIsLoading,
      currentUserTwitchId,
      isOwnProfile,
      dataIsLoading,
      loadingProfile,
      profileExists,
      isRegistered,
      twitchUserDataExists: !!twitchUserData,
      profileDataExists: !!profileData,
      profileDataReceived: profileData,
      userRolesString,
      userRolesArray,
      isAdmin,
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
  const followersCount = twitchUserData?.followers_count ?? profileData?.twitch_follower_count;
  const createdAt = twitchUserData?.created_at;
  const broadcasterType = twitchUserData?.broadcaster_type || profileData?.twitch_broadcaster_type;
  const profileDescription = isRegistered ? profileData?.description : twitchUserData?.description;
  const profileSocialLinks = isRegistered ? profileData?.social_links : null;
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

  const handleLogout = async () => {
    await signOut();
    router.push('/'); // Редирект на главную после выхода
  };

  return (
    <div className={styles.container}> 
      <div className={styles.topBar}>
          <button onClick={() => router.back()} className={styles.backButton}>
              &larr; Назад
          </button>
          <div className={styles.actionButtons}>
              {isOwnProfile && isRegistered && isAdmin && (
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
               {isOwnProfile && (
                   <button onClick={() => router.push('/edit-profile')} className={`${styles.actionButton} ${styles.editButton}`} title="Редактировать">
                       ⚙️ Редакт.
                   </button>
               )}
               {isOwnProfile && (
                   <button onClick={handleLogout} className={`${styles.actionButton} ${styles.logoutButton}`}>
                        🚪 Выйти
                   </button>
               )}
               {isOwnProfile && !isRegistered && (
                   <button onClick={handleInvite} className={styles.actionButton}>
                       🤝 Пригласить на Streamers Universe
                   </button>
               )}
          </div>
      </div>

      {error && <p className={styles.errorMessage}>{error}</p>}

      <div className={styles.profileGrid}> 
          <div className={styles.avatarContainer}>
                <CyberAvatar 
                    src={avatarUrl}
                    alt={`Аватар ${displayName}`} 
                    size={120}
                    priority={true} 
                    className={styles.avatar}
                />
          </div>

          <div className={styles.profileInfo}> 
              <h1 className={styles.displayName}>{displayName}</h1>
              <p className={styles.loginName}>@{twitchUserData?.login}</p>
              {isRegistered && userRolesArray.length > 0 && (
                  <p className={styles.userRole}>{userRolesArray.join(', ')}</p>
              )}
              {!isRegistered && (
                    <div className={styles.notRegisteredBadge}>
                        <p>😥 Пользователь ещё не с нами</p>
                        {!isOwnProfile && isAuthenticated && (
                            <button onClick={handleInvite} className={styles.inlineInviteButton}>
                                Пригласить!
                            </button>
                        )}
                    </div>
               )}
              <div className={styles.stats}>
                {followersCount !== null && typeof followersCount !== 'undefined' && (
                    <p>👥 {followersCount.toLocaleString('ru-RU')} {pluralize(followersCount, 'фолловер', 'фолловера', 'фолловеров')}</p>
                )}
                {viewCount !== null && typeof viewCount !== 'undefined' && (
                    <p>👁️ {viewCount.toLocaleString('ru-RU')} {pluralize(viewCount, 'просмотр', 'просмотра', 'просмотров')}</p>
                )}
                 {createdAt && (
                    <p>📅 На Twitch с {formattedDate}</p>
                )}
                {broadcasterType && broadcasterType !== 'normal' && (
                     <p>💼 Статус: {translateBroadcasterType(broadcasterType)}</p>
                )}
              </div>
          </div>

          <div className={styles.socialLinksSidebar}> 
                 {(profileSocialLinks?.vk || profileSocialLinks?.twitch || profileSocialLinks?.discord || profileSocialLinks?.youtube || profileSocialLinks?.telegram || profileSocialLinks?.tiktok || profileSocialLinks?.boosty || profileSocialLinks?.yandex_music || twitchUserData?.login) ? (
                    <>
                        {profileSocialLinks?.vk && (
                            <VkButton value={profileSocialLinks.vk} className={styles.socialButton} />
                        )}
                        {twitchUserData?.login && (
                            <TwitchButton value={twitchUserData.login} count={followersCount} className={styles.socialButton} />
                        )}
                        {profileSocialLinks?.discord && (
                            <DiscordButton value={profileSocialLinks.discord} className={styles.socialButton} />
                        )}
                        {profileSocialLinks?.youtube && (
                            <YoutubeButton value={profileSocialLinks.youtube} className={styles.socialButton} />
                        )}
                        {profileSocialLinks?.telegram && (
                            <TelegramButton value={profileSocialLinks.telegram} className={styles.socialButton} />
                        )}
                        {profileSocialLinks?.tiktok && (
                            <TiktokButton value={profileSocialLinks.tiktok} className={styles.socialButton} />
                        )}
                        {profileSocialLinks?.boosty && (
                            <BoostyButton value={profileSocialLinks.boosty} className={styles.socialButton} />
                        )}
                        {profileSocialLinks?.yandex_music && (
                            <YandexMusicButton value={profileSocialLinks.yandex_music} className={styles.socialButton} />
                        )}
                    </>
                 ) : isRegistered ? (
                     <p className={styles.noSocials}>Нет ссылок</p>
                 ) : null /* Ничего не показываем для незареганных без ссылок */}
          </div>
      </div>

      <div className={styles.profileDescription}>
         <h2>Описание</h2>
         <p>{profileDescription || 'Пользователь пока ничего не рассказал о себе.'}</p>
      </div>

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