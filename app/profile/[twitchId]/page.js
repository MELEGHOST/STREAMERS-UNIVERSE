'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import useSWR from 'swr';
import Image from 'next/image';
import CyberAvatar from '../../components/CyberAvatar';
import styles from '../profile.module.css';
import pageStyles from '../../../styles/page.module.css';
import { useAuth } from '../../contexts/AuthContext';
import { pluralize } from '../../utils/pluralize';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { FaArrowLeft, FaShieldAlt, FaBookOpen, FaTrophy, FaEdit, FaSignOutAlt } from 'react-icons/fa';

import VkButton from '../../components/SocialButtons/VkButton';
import TwitchButton from '../../components/SocialButtons/TwitchButton';
import YoutubeButton from '../../components/SocialButtons/YoutubeButton';
import DiscordButton from '../../components/SocialButtons/DiscordButton';
import TelegramButton from '../../components/SocialButtons/TelegramButton';
import TiktokButton from '../../components/SocialButtons/TiktokButton';
import BoostyButton from '../../components/SocialButtons/BoostyButton';
import YandexMusicButton from '../../components/SocialButtons/YandexMusicButton';
import StatisticsWidget from '../../components/ProfileWidgets/StatisticsWidget';
import AchievementsWidget from '../../components/ProfileWidgets/AchievementsWidget';
import InviteButton from '../../components/InviteButton/InviteButton';
import I18nProvider from '../../components/I18nProvider';

const socialButtonComponents = {
    vk: VkButton,
    twitch: TwitchButton,
    youtube: YoutubeButton,
    discord: DiscordButton,
    telegram: TelegramButton,
    tiktok: TiktokButton,
    boosty: BoostyButton,
    yandex_music: YandexMusicButton,
};

const RoleBadge = ({ role, t }) => {
    let styleClass = '';
    let text = '';
    let icon = '';

    switch (role) {
        case 'admin':
            styleClass = styles.admin;
            text = t('roles.admin');
            icon = '👑';
            break;
        case 'streamer':
            styleClass = styles.streamer;
            text = t('roles.streamer');
            icon = '🎙️';
            break;
        default:
            return null;
    }
    
    return (
        <span className={`${styles.roleBadge} ${styleClass}`}>
            {icon} {text}
        </span>
    );
};

const translateBroadcasterType = (type, t) => {
    const key = `profile.broadcasterType.${type || 'normal'}`;
    return t(key, { defaultValue: type || 'User' });
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

const formatDate = (dateString, locale) => {
  if (!dateString) return t('common.unknown');
  try {
    return new Date(dateString).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return t('common.unknown');
  }
};

const fetcher = async (url, token) => {
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(url, { headers });
    if (!res) throw new Error('No response from server');

    if (!res.ok) {
        const errorInfo = {
            status: res.status,
            message: `Ошибка API (${res.status}): ${await res.text() || res.statusText}`,
            exists: res.status !== 404
        };
        console.error(`[SWR fetcher] ${errorInfo.message}`);
        throw errorInfo;
    }
    return res.json();
};

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const profileTwitchId = params.twitchId;
  const { t } = useTranslation();

  const { user, isAuthenticated, supabase, isLoading: authIsLoading, signOut } = useAuth();
  
  const currentUserTwitchId = !authIsLoading ? user?.user_metadata?.provider_id : undefined;
  const isOwnProfile = !authIsLoading && !!currentUserTwitchId && currentUserTwitchId === profileTwitchId;
  
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

  const apiUrl = `/api/twitch/user?userId=${profileTwitchId}&fetchProfile=true`;
  const { data: apiData, error: apiError, isLoading: isDataLoading } = useSWR(
  profileTwitchId && authToken ? [apiUrl, authToken] : null,
  ([url, token]) => fetcher(url, token)
);
  const loadingProfile = (!profileTwitchId || authIsLoading || isDataLoading);
  const error = apiError ? (apiError.message || 'Unknown error') : null;
  const profileExists = error ? error.exists !== false : !!apiData?.twitch_user;
  
  const twitchUserData = apiData?.twitch_user || null;
  const profileData = apiData?.profile || null;
  const videos = apiData?.twitch_user?.videos || [];
  const isRegistered = !!profileData;

  const userRolesString = isRegistered ? profileData?.role : null;
  const userRolesArray = userRolesString?.split(',').map(role => role.trim().toLowerCase()).filter(Boolean) || [];
  const isAdmin = userRolesArray.includes('admin');
  const isStreamer = twitchUserData?.broadcaster_type === 'partner' || twitchUserData?.broadcaster_type === 'affiliate';

  const getNicknameStyle = () => {
    const adminColor = '#ffd700';
    const streamerColor = '#9146ff';

    if (isAdmin && isStreamer) {
        return {
            background: `linear-gradient(90deg, ${adminColor} 0%, ${streamerColor} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textFillColor: 'transparent',
            display: 'inline-block' // Необходимо для работы background-clip
        };
    } else if (isAdmin) {
        return { color: adminColor };
    } else if (isStreamer) {
        return { color: streamerColor };
    }
    return {}; // Стиль по умолчанию
  };

  const nicknameStyle = getNicknameStyle();
  const profileWidget = profileData?.profile_widget;

  if (loadingProfile) {
      return (
          <div className={styles.skeletonHeader}>
              <div className={styles.skeletonAvatar}></div>
              <div className={styles.skeletonInfo}>
                  <div className={styles.skeletonTextLarge}></div>
                  <div className={styles.skeletonText}></div>
                  <div className={`${styles.skeletonText} ${styles.short}`}></div>
              </div>
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
  const formattedDate = createdAt ? formatDate(createdAt, t.language) : t('common.unknown');

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <I18nProvider>
      <div className={styles.container}>
        <div className={styles.profileControls}>
            <button onClick={() => router.back()} className={styles.controlButton}>
                <FaArrowLeft /> {t('profile.back')}
            </button>
            <div className={styles.rightControls}>
                {isOwnProfile && (
                    <>
                        {isAdmin && (
                            <Link href="/admin/reviews" className={`${styles.controlButton} ${styles.adminButton}`}>
                                <FaShieldAlt /> {t('profile.adminPanel')}
                            </Link>
                        )}
                        <Link href="/my-reviews" className={styles.controlButton}>
                            <FaBookOpen /> {t('profile.myReviews')}
                        </Link>
                        <Link href="/achievements" className={styles.controlButton}>
                            <FaTrophy /> {t('profile.achievements')}
                        </Link>
                        <Link href="/edit-profile" className={styles.controlButton}>
                            <FaEdit /> {t('profile.edit')}
                        </Link>
                        <button onClick={handleLogout} className={`${styles.controlButton} ${styles.logoutButton}`}>
                            <FaSignOutAlt /> {t('logout')}
                        </button>
                    </>
                )}
            </div>
        </div>
        <header className={styles.profileHeader}>
            <div className="pixel-card">
                <CyberAvatar src={avatarUrl} alt={t('profile.avatarAlt', { name: displayName })} size={160} />
            </div>
            <div className={styles.profileInfo}>
                <h1 className={styles.displayName}>
                    <span style={nicknameStyle}>{displayName}</span>
                    {isAdmin && <RoleBadge role="admin" t={t} />}
                    {isStreamer && <RoleBadge role="streamer" t={t} />}
                </h1>
                <p className={styles.loginName}>@{twitchUserData?.login || profileData?.twitch_login || '???'}</p>
                <p className={styles.profileDescription}>{profileDescription}</p>
                <div className={styles.profileDetails}>
                    <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>{t('profile.broadcasterType')}:</span>
                        <span className={styles.detailValue}>{translateBroadcasterType(broadcasterType, t)}</span>
                    </div>
                    <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>{t('profile.createdAt')}:</span>
                        <span className={styles.detailValue}>{formattedDate}</span>
                    </div>
                    <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>{t('profile.followers')}:</span>
                        <span className={styles.detailValue}>{pluralize(followersCount, t('common.follower'))}</span>
                    </div>
                    <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>{t('profile.views')}:</span>
                        <span className={styles.detailValue}>{pluralize(viewCount, t('common.view'))}</span>
                    </div>
                </div>
            </div>
        </header>
        <div className={styles.profileContent}>
            <div className={styles.profileSections}>
                <section className={styles.profileSection}>
                    <h2 className={styles.sectionTitle}>{t('profile.' + profileWidget)}</h2>
                    {profileWidget === 'statistics' ? (
                        <StatisticsWidget twitchUserData={twitchUserData} profileData={profileData} />
                    ) : (
                        <AchievementsWidget profileData={profileData} />
                    )}
                </section>
                <section className={styles.profileSection}>
                    <h2 className={styles.sectionTitle}>{t('profile.videos')}</h2>
                    <div className={styles.videosGrid}>
                        {videos.map((video) => (
                            <div key={video.id} className={styles.videoItem}>
                                <Link href={`https://www.twitch.tv/${video.user_login}/video/${video.id}`} target="_blank" rel="noopener noreferrer">
                                    <Image
                                        src={video.thumbnail_url.replace('%{width}', '200').replace('%{height}', '112')}
                                        alt={video.title}
                                        width={200}
                                        height={112}
                                        className={styles.videoThumbnail}
                                    />
                                    <div className={styles.videoInfo}>
                                        <h3 className={styles.videoTitle}>{video.title}</h3>
                                        <p className={styles.videoDuration}>{formatDuration(video.duration)}</p>
                                    </div>
                                </Link>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
            <aside className={styles.profileSidebar}>
                <section className={styles.sidebarSection}>
                    <h3 className={styles.sidebarTitle}>{t('profile.socialLinks')}</h3>
                    <div className={styles.socialLinks}>
                        {profileSocialLinks && Object.entries(profileSocialLinks).map(([platform, link]) => (
                            <div key={platform} className={styles.socialLinkItem}>
                                <SocialButton platform={platform} link={link} />
                            </div>
                        ))}
                    </div>
                </section>
                <section className={styles.sidebarSection}>
                    <h3 className={styles.sidebarTitle}>{t('profile.invite')}</h3>
                    <InviteButton />
                </section>
            </aside>
        </div>
      </div>
    </I18nProvider>
  );
}

const SocialButton = ({ platform, link }) => {
    const Component = socialButtonComponents[platform];
    if (!Component) return null;
    return <Component link={link} />;
};