'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import styles from './profile.module.css';
import pageStyles from '../../styles/page.module.css';
import Image from 'next/image';
// import CyberAvatar from '../components/CyberAvatar';
import AvatarSocialOverlay from '../components/AvatarSocialOverlay.jsx';
import ProfileShowcaseCard from '../components/ProfileCard/ProfileShowcaseCard.jsx';
import RouteGuard from '../components/RouteGuard';
import { useTranslation } from 'react-i18next';
import I18nProvider from '../components/I18nProvider'; // Добавляем импорт
import { FaEdit, FaPlus, FaTrophy, FaSignOutAlt, FaShieldAlt } from 'react-icons/fa';
import Link from 'next/link';
import StatisticsWidget from '../components/ProfileWidgets/StatisticsWidget';
import useSWR from 'swr';

// (удалено) translateBroadcasterType больше не используется

// Предполагаемая функция fetcher для useSWR
const fetcher = (url, token) => fetch(url, {
    headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
}).then(res => res.json());

function ProfilePageContent() {
    const { t } = useTranslation();
    const { user, supabase, loading: authLoading, userRole } = useAuth();
    const router = useRouter();
    const twitchUserId = user?.user_metadata?.provider_id;

    const [authToken, setAuthToken] = useState(null);
    const [isOverlayOpen, setIsOverlayOpen] = useState(false);
    const [profileData, setProfileData] = useState(null);
    useEffect(() => {
        const getToken = async () => {
            if (supabase) {
                const session = await supabase.auth.getSession();
                setAuthToken(session.data.session?.access_token || null);
            }
        };
        if (!authLoading) {
            getToken();
        }
    }, [supabase, authLoading]);

    const { data, error: swrError } = useSWR(twitchUserId && authToken !== null ? [`/api/twitch/user?userId=${twitchUserId}`, authToken] : null, ([url, token]) => fetcher(url, token));

    const [twitchUserData, setTwitchUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const fetchTwitchUserData = useCallback(async () => {
        if (!twitchUserId) {
            setError('Twitch user ID is missing.');
            return;
        }
        try {
            const response = await fetch(`/api/twitch/user?userId=${twitchUserId}`);
            if (!response.ok) throw new Error('Failed to fetch Twitch user data');
            const fetchedData = await response.json();
            setTwitchUserData(fetchedData.twitch_user);
        } catch (err) {
            console.error(err);
            setError(err.message);
        }
    }, [twitchUserId]);

    const fetchAllData = useCallback(async () => {
      if (!user || !supabase || !twitchUserId) {
          setError('Missing user or Supabase instance.');
          setLoading(false);
          return;
      }
      
      console.log(`[ProfilePage] Загрузка ВСЕХ данных для twitchUserId: ${twitchUserId}, userId: ${user.id}`);
      setLoading(true);
      setError(null);

      // Параллельная загрузка
      try {
          const [, db] = await Promise.all([
              fetchTwitchUserData(),
              supabase
                .from('user_profiles')
                .select('social_links, birthday, role, description, profile_widget')
                .eq('user_id', user.id)
                .maybeSingle()
          ]);
          if (db?.data) setProfileData(db.data);
      } catch (err) {
          setError('Error loading profile: ' + err.message);
      }

      setLoading(false);

    }, [user, supabase, twitchUserId, fetchTwitchUserData]);

    useEffect(() => {
        if (!authLoading && user) {
            fetchAllData();
        }
    }, [authLoading, fetchAllData, user]);

    useEffect(() => {
        if (data && data.twitch_user) {
            setTwitchUserData(data.twitch_user);
        }
    }, [data]);

    if (authLoading || loading || !twitchUserData) {
        return (
            <div className={pageStyles.loadingContainer}>
                <p>Загрузка профиля...</p>
            </div>
        );
    }
    
    if (swrError || error) {
        return <div className={pageStyles.container}><p className={pageStyles.errorMessage}>{swrError?.message || error}</p></div>;
    }
    
    if (!user) {
        // Это состояние не должно возник при использовании RouteGuard, но на всякий случай
        return (
            <div className={pageStyles.container}>
                <p>{t('profile.notWithUs')}</p>
                {/* Можно добавить кнопку для выхода или возврата */}
            </div>
        )
    }

    const displayName = twitchUserData?.display_name || user?.user_metadata?.full_name || t('loading.generic');
    // const bio = (profileData?.description) || twitchUserData?.description || t('profile_page.noBio');

    // --- Логика виджетов ---
    const StatsWidget = () => {
        const stats = [
            { title: t('followers'), value: twitchUserData?.followers_count || 0, icon: '👥' },
            // TODO: Заменить на реальные данные о просмотрах, если Twitch API их отдает
            { title: t('profile_page.views'), value: twitchUserData?.view_count || 0, icon: '👁️' },
            // TODO: Придумать еще статы. Например, дата регистрации на Twitch
            { title: t('profile_page.registrationDate'), value: twitchUserData ? new Date(twitchUserData.created_at).toLocaleDateString() : 'N/A', icon: '📅' }
        ];

        return <StatisticsWidget stats={stats} />;
    };

    const AchievementsWidget = () => {
        const { data: apiPayload, error: achError } = useSWR('/api/achievements', fetcher);
        if (achError) {
            return <div className={pageStyles.errorMessage}>{t('profile_page.achievements_page.error', { message: achError.message || 'Failed to load' })}</div>;
        }
        const achievements = Array.isArray(apiPayload)
            ? apiPayload
            : (Array.isArray(apiPayload?.achievements) ? apiPayload.achievements : []);
        const unlockedAchievements = achievements.filter(ach => ach?.is_unlocked);
        return (
            <div className={styles.widget}>
                <h3>{t('profile_page.achievements.title')}</h3>
                {unlockedAchievements.length > 0 ? (
                    <ul>
                        {unlockedAchievements.map(ach => (
                            <li key={ach.id}>
                                {ach.name} ({Number(ach.rarity || 0).toFixed(1)}% {t('achievements.rarity')})
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>{t('achievements_page.noAchievements')}</p>
                )}
            </div>
        );
    };

    const ReviewsWidget = () => {
        const [reviews, setReviews] = useState([]);
        const [reviewsLoading, setReviewsLoading] = useState(true);
        const [reviewsError, setReviewsError] = useState(null);

        useEffect(() => {
            const fetchReviews = async () => {
                if (!twitchUserId) return;
                setReviewsLoading(true);
                setReviewsError(null);
                try {
                    const response = await fetch(`/api/reviews/streamer/${twitchUserId}`);
                    if (!response.ok) throw new Error('Failed to fetch reviews');
                    const data = await response.json();
                    setReviews(Array.isArray(data) ? data : []);
                } catch (err) {
                    console.error('[ProfilePage] Failed to fetch reviews:', err);
                    setReviewsError('Не удалось загрузить отзывы');
                } finally {
                    setReviewsLoading(false);
                }
            };
            fetchReviews();
        }, [twitchUserId]);

        if (reviewsLoading) {
            return <div className={styles.loadingContainer}><p>Загрузка...</p></div>;
        }

        return (
            <div className={styles.widget}>
                <h3>{t('profile_page.reviews.title')}</h3>
                {reviewsError ? (
                    <p className={pageStyles.errorMessage}>{reviewsError}</p>
                ) : reviews.length > 0 ? (
                    <ul>
                        {reviews.map((review) => (
                            <li key={review.id}>
                                <strong>{review.author ?? t('common.unknown')}:</strong> &quot;{review.text}&quot; ({'★'.repeat(Number(review.rating) || 0)})
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>{t('profile_page.reviews.noReviews')}</p>
                )}
                <Link href={`/reviews/streamer/${twitchUserId}`} className={styles.widgetLink}>
                    {t('profile_page.reviews.readAll')}
                </Link>
            </div>
        );
    };

    // Add videos section
    const formatDuration = (duration) => {
        try {
          if (typeof duration !== 'string' || !duration) return '0s';
          let totalSeconds = 0;
          const hoursMatch = duration.match(/(\d+)h/);
          const minutesMatch = duration.match(/(\d+)m/);
          const secondsMatch = duration.match(/(\d+)s/);
          if (hoursMatch && hoursMatch[1]) totalSeconds += parseInt(hoursMatch[1], 10) * 3600;
          if (minutesMatch && minutesMatch[1]) totalSeconds += parseInt(minutesMatch[1], 10) * 60;
          if (secondsMatch && secondsMatch[1]) totalSeconds += parseInt(secondsMatch[1], 10);
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = totalSeconds % 60;
          let formatted = '';
          if (hours > 0) formatted += `${hours}h `;
          if (minutes > 0 || hours > 0) formatted += `${minutes}m `;
          if (seconds > 0 || totalSeconds === 0) formatted += `${seconds}s`;
          return formatted.trim() || '0s';
        } catch (e) {
          console.error('Error in formatDuration:', e);
          return '0s';
        }
    };

    return (
        <I18nProvider>
            <div className={pageStyles.container}>
                <div style={{ display:'flex', justifyContent:'space-between', width:'100%', marginBottom:'12px' }}>
                  <button onClick={() => router.back()} className={styles.backButton}>{t('profile.back', { defaultValue: 'Назад' })}</button>
                </div>
                <header className={styles.profileHeader} style={{ justifyContent: 'center' }}>
                    <div className={styles.avatarContainer} style={{ display:'flex', justifyContent:'center', width:'100%' }}>
                        <ProfileShowcaseCard
                          avatarUrl={twitchUserData?.profile_image_url || user.user_metadata.avatar_url}
                          displayName={displayName}
                          username={twitchUserData?.login || user.user_metadata.user_name}
                          level={0}
                          followersCount={twitchUserData?.followers_goal?.current ?? twitchUserData?.followers_count ?? 0}
                          followersTarget={twitchUserData?.followers_goal?.target ?? 1000}
                          statusText={userRole || profileData?.role || 'Зритель'}
                          birthdayText={profileData?.birthday ? new Date(profileData.birthday).toLocaleDateString() : ''}
                          onAvatarClick={() => setIsOverlayOpen(true)}
                        />
                    </div>

                </header>

                <div className={styles.actionsBar}>
                  <button onClick={() => router.push('/edit-profile')} className={styles.chip}>
                    <FaEdit /> {t('profile_page.editProfile', { defaultValue: 'Редактировать профиль' })}
                  </button>
                  <button onClick={() => router.push('/reviews/create')} className={styles.chip}>
                    <FaPlus /> {t('profile_page.addReview', { defaultValue: 'Добавить отзыв' })}
                  </button>
                  <button onClick={() => router.push('/achievements')} className={styles.chip}>
                    <FaTrophy /> {t('profile_page.myAchievements', { defaultValue: 'Мои достижения' })}
                  </button>
                  {userRole === 'admin' && (
                    <button onClick={() => router.push('/admin/reviews')} className={styles.chip}>
                      <FaShieldAlt /> {t('profile_page.adminPanel', { defaultValue: 'Админ-панель' })}
                    </button>
                  )}
                  <button onClick={() => supabase.auth.signOut()} className={styles.chip}>
                    <FaSignOutAlt /> {t('logout', { defaultValue: 'Выйти' })}
                  </button>
                </div>

                <main className={styles.mainContent}>
                    <div className={styles.widgetsGrid}>
                       <StatsWidget />
                       <AchievementsWidget />
                       <ReviewsWidget />
                        {/* Другие виджеты можно будет добавлять сюда */}
                    </div>
                    <section className={styles.profileSection}>
      <h2 className={styles.sectionTitle}>{t('profile.videos')}</h2>
      <div className={styles.videosGrid}>
        {twitchUserData?.videos?.map((video) => (
          <div key={video.id} className={styles.videoItem}>
            <Link href={`https://www.twitch.tv/${video.user_login}/video/${video.id}`} target="_blank" rel="noopener noreferrer">
              <Image
                src={video.thumbnail_url}
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
        )) || <p>No videos available</p>}
      </div>
    </section>
                </main>
        </div>
        {isOverlayOpen && (
          <AvatarSocialOverlay
            avatarUrl={twitchUserData?.profile_image_url || user.user_metadata.avatar_url}
            displayName={displayName}
            socialLinks={profileData?.social_links}
            onClose={() => setIsOverlayOpen(false)}
          />
        )}
        </I18nProvider>
      );
    };


export default function ProfilePage() {
  return (
    <RouteGuard>
      <ProfilePageContent />
    </RouteGuard>
    )
} 