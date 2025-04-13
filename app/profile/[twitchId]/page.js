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

  // --- Debug Log: Финальные данные перед рендером ---
  console.log('[UserProfilePage] Final state before render:', {
      profileTwitchId,
      authIsLoading,
      currentUserTwitchId,
      isOwnProfile, // <<< Используем значение, вычисленное ранее
      dataIsLoading,
      loadingProfile,
      profileExists,
      isRegistered,
      twitchUserDataExists: !!twitchUserData,
      profileDataExists: !!profileData,
      error
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

  // <<< Добавляем иконку Telegram >>>
  const socialButtonIcons = {
    vk: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0ZM18.4874 14.307C19.0297 14.7013 19.477 15.021 19.8295 15.2662C20.2556 15.5664 20.4818 15.7734 20.5079 15.8871C20.581 16.2068 20.3414 16.4727 19.7883 16.6849C19.1749 16.9245 18.4299 16.9954 17.5532 16.8975C16.321 16.756 15.3597 16.2947 14.6691 15.5135C14.3048 15.1052 13.9638 14.7715 13.6461 14.5123C13.1921 14.1413 12.862 13.9202 12.6558 13.8489C12.4496 13.7777 12.2909 13.7419 12.1796 13.7419C12.0617 13.7419 11.9169 13.7846 11.7452 13.8701C11.5669 13.9621 11.1586 14.3397 10.5204 15.0037C9.85523 15.6951 9.3194 16.2366 8.91301 16.6281C8.7002 16.8403 8.4874 17.0183 8.27459 17.162C7.84856 17.4587 7.4662 17.5867 7.12749 17.5458C6.62111 17.484 6.2194 17.229 5.92244 16.7807C5.63854 16.3455 5.56133 15.8552 5.69081 15.31C5.71077 15.2322 5.78415 14.9509 5.91109 14.4661C6.72818 11.6553 7.96186 9.42074 9.61214 7.7623C10.9113 6.45652 12.2507 5.71746 13.6304 5.5451C14.7398 5.41061 15.6958 5.65429 16.5063 6.27613C16.6242 6.3681 16.7152 6.49071 16.7792 6.64397C16.8432 6.79723 16.8737 6.96357 16.8707 7.14297C16.8613 7.45227 16.7278 7.687 16.4704 7.84708C16.2195 8.00716 16.0021 8.07058 15.8181 8.03734C15.5984 7.99787 15.4186 8.0613 15.2788 8.22764C15.1455 8.39398 15.0789 8.61498 15.0789 8.89064V11.5565C15.0789 11.9446 15.1455 12.2179 15.2788 12.3766C15.4121 12.5352 15.6185 12.6071 15.8979 12.5921C16.3839 12.5615 16.7216 12.7068 16.9119 13.028C17.1022 13.3492 17.1974 13.7372 17.1974 14.1921C17.1974 14.3516 17.184 14.5454 17.1572 14.7735C17.1303 15.0015 17.117 15.1893 17.117 15.3368C17.117 15.6292 17.2068 15.8349 17.3865 15.9538C17.5728 16.0727 17.8489 16.1322 18.2151 16.1322C18.5186 16.1322 18.717 16.0261 18.8101 15.8139C18.9032 15.6017 18.95 15.3093 18.95 14.9367C18.95 14.5871 18.8051 14.2534 18.4874 14.307Z"/></svg>, // VK SVG
    twitch: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M4.264 3.003L2 6.07V18.12h4.823V22l3.429-3.88h3.135L22 10.217V3.003H4.264zm15.176 6.66l-3.43 3.43h-3.428l-2.572 2.57v-2.57H6.088V4.826h13.352v4.837z"/><path d="M17.085 6.65h-1.714v4.283h1.714V6.65zm-4.286 0H11.08v4.283h1.719V6.65z"/></svg>, // Twitch SVG
    youtube: () => <FaYoutube size={24} />,
    tiktok: () => <FaTiktok size={24} />, // Добавили TikTok
    boosty: () => <SiBoosty size={24} />, // Добавили Boosty
    // discord: () => <FaDiscord size={24} />, // Discord теперь отдельный компонент
    telegram: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M11.9994 0C5.37206 0 0 5.37206 0 11.9994C0 18.6268 5.37206 23.9989 11.9994 23.9989C18.6268 23.9989 23.9989 18.6268 23.9989 11.9994C23.9989 5.37206 18.6268 0 11.9994 0ZM17.6311 7.32748C17.2977 8.81885 16.1277 14.443 15.6086 16.9392C15.4159 17.831 15.0076 18.1961 14.5975 18.226C13.9887 18.2704 13.5342 17.9661 13.1654 17.7027C12.6384 17.3213 12.3233 17.0442 11.7963 16.6628C11.2124 16.239 10.7682 15.9145 10.8229 15.737C10.8684 15.5878 11.0441 15.4387 12.0516 14.4997C12.9547 13.6581 13.6267 13.0319 13.6083 12.8846C13.5864 12.7138 13.4125 12.8372 13.1899 12.9915C12.9672 13.1459 12.3388 13.5558 11.2993 14.2926C10.3225 14.9694 9.60865 15.3838 9.15771 15.3838C8.78887 15.3838 8.1923 15.2066 7.82345 15.0814C7.36428 14.927 6.91686 14.7931 6.97154 14.4473C7.01012 14.1875 7.33233 13.9499 7.93818 13.7345C10.4691 12.8036 12.3284 12.1267 13.5149 11.703C15.4682 11.0364 16.2958 10.7592 16.3495 10.3045C16.3679 10.1319 16.3255 9.98456 16.2223 9.86245C16.119 9.74034 15.9686 9.66365 15.7707 9.6319C15.3561 9.56421 14.7912 9.79557 14.0761 10.3259C13.1847 10.9925 11.556 12.1957 9.18998 13.9356C8.82481 14.1936 8.53909 14.3293 8.33282 14.3413C8.04894 14.3568 7.76321 14.2546 7.47565 14.0347C7.19544 13.8184 6.9728 13.543 6.80771 13.2084C6.64262 12.8738 6.56116 12.5224 6.563 12.1542C6.56483 11.7859 6.64845 11.4344 6.81389 11.1017C7.03873 10.6556 7.3282 10.3147 7.6813 10.0789C10.326 8.26038 12.3107 6.9793 13.6354 6.23564C15.1635 5.39588 16.3431 4.87474 17.1742 4.67222C17.6334 4.55715 17.914 4.65937 18.0172 4.97886C18.0898 5.21249 18.0441 5.49511 17.9802 5.82673C17.8506 6.49157 17.4502 7.85764 16.7792 9.92397L17.6311 7.32748Z"/></svg>,
  };

  // Функция для безопасного создания URL
  const createSafeUrl = (baseUrl, value) => {
      if (!value) return null;
      try {
          // Проверяем, является ли value уже полным URL
          if (/^https?:\/\//i.test(value)) {
              return new URL(value).toString();
          }
          // Если нет, считаем, что это username/id и добавляем к baseUrl
          if (baseUrl) {
              // Удаляем возможный слеш в конце baseUrl
              const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
              // Удаляем возможный @ или / в начале value
              const cleanValue = value.startsWith('@') || value.startsWith('/') ? value.slice(1) : value;
              return `${cleanBase}/${cleanValue}`;
          }
          // Если нет baseUrl, а value не URL, то ссылка некорректна
          return null; 
      } catch (e) {
          console.warn(`Invalid URL format: ${value}`, e);
          return null;
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
               {isOwnProfile && (
                   <button onClick={() => router.push('/edit-profile')} className={`${styles.actionButton} ${styles.editButton}`} title="Редактировать">
                       ⚙️ Редакт.
                   </button>
               )}
               {isOwnProfile && (
                   <button onClick={handleLogout} className={`${styles.actionButton} ${styles.logoutButton}`} title="Выйти">
                       🚪 Выйти
                   </button>
               )}
               {!isOwnProfile && isRegistered && isAuthenticated && (
                   <button onClick={() => alert('Скоро!')} className={`${styles.actionButton} ${styles.followButton}`} title="Подписаться">
                       ➕ Подписаться
                   </button>
               )}
               {!isOwnProfile && !isRegistered && (
                    <button onClick={handleInvite} className={`${styles.actionButton} ${styles.inviteButton}`} title="Пригласить в Streamers Universe">
                        💌 Пригласить
                    </button>
                )}
          </div>
      </div>

      {error && <p className={styles.errorMessage}>{error}</p>}

      <div className={styles.profileHeader}>
          <CyberAvatar 
              src={avatarUrl}
              alt={`Аватар ${displayName}`} 
              size={120}
              priority={true} 
              className={styles.avatar}
          />
          <div className={styles.profileInfo}>
              <h1 className={styles.displayName}>{displayName}</h1>
              <p className={styles.loginName}>@{twitchUserData?.login}</p>
              {isRegistered && userRole && <p className={styles.userRole}>{userRole}</p>}
              {!isRegistered && (
                    <div className={styles.notRegisteredBadge}>
                        <p>😥 Пользователь ещё не с нами</p>
                         {/* Можно добавить кнопку "Пригласить", если не владелец смотрит */}
                        {!isOwnProfile && isAuthenticated && (
                            <button onClick={handleInvite} className={styles.inlineInviteButton}>
                                Пригласить!
                            </button>
                        )}
                    </div>
               )}
              <div className={styles.stats}>
                {followersCount !== null && typeof followersCount !== 'undefined' && (
                    <p>👥 {followersCount.toLocaleString('ru-RU')} последователей</p>
                )}
                {viewCount !== null && typeof viewCount !== 'undefined' && (
                    <p>👁️ {viewCount.toLocaleString('ru-RU')} просмотров</p>
                )}
                 {createdAt && (
                    <p>📅 На Twitch с {formattedDate}</p>
                )}
                {broadcasterType && broadcasterType !== 'normal' && (
                     <p>💼 Статус: {translateBroadcasterType(broadcasterType)}</p>
                )}
              </div>
              <div className={styles.socialLinks}> 
                {/* <<< Исправляем рендеринг + Добавляем Telegram >>> */}
                 {profileSocialLinks?.vk && (
                   <StyledSocialButton 
                       network="vk"
                       url={createSafeUrl('https://vk.com', profileSocialLinks.vk)} 
                       icon={socialButtonIcons.vk} 
                       ariaLabel="VK Профиль"
                       className={styles.socialButton}
                   />
                 )}
                 {profileSocialLinks?.twitch && (
                   <StyledSocialButton 
                       network="twitch"
                       url={createSafeUrl('https://twitch.tv', profileSocialLinks.twitch)}
                       icon={socialButtonIcons.twitch}
                       ariaLabel="Twitch Канал"
                       className={styles.socialButton}
                   />
                 )}
                 {/* Используем отдельный DiscordButton */}
                 {profileSocialLinks?.discord && (
                     <DiscordButton 
                         value={profileSocialLinks.discord}
                         className={styles.socialButton}
                     />
                 )}
                 {profileSocialLinks?.youtube && (
                    <StyledSocialButton 
                       network="youtube"
                       url={createSafeUrl('https://youtube.com', profileSocialLinks.youtube)} 
                       icon={socialButtonIcons.youtube} 
                       ariaLabel="YouTube Канал"
                       className={styles.socialButton}
                   />
                 )}
                 {/* <<< Добавляем TelegramButton >>> */}
                  {profileSocialLinks?.telegram && (
                     <TelegramButton
                         username={profileSocialLinks.telegram}
                         className={styles.socialButton}
                     />
                   )}
                 {profileSocialLinks?.tiktok && (
                   <StyledSocialButton 
                       network="tiktok"
                       url={createSafeUrl('https://tiktok.com', profileSocialLinks.tiktok)} 
                       icon={socialButtonIcons.tiktok} 
                       ariaLabel="TikTok Профиль"
                       className={styles.socialButton}
                   />
                 )}
                 {profileSocialLinks?.boosty && (
                   <StyledSocialButton 
                       network="boosty"
                       url={createSafeUrl('https://boosty.to', profileSocialLinks.boosty)} 
                       icon={socialButtonIcons.boosty} 
                       ariaLabel="Boosty Профиль"
                       className={styles.socialButton}
                   />
                 )}
                 {/* Добавить другие иконки по аналогии... */}
              </div>
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