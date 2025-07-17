'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import styles from './profile.module.css';
import pageStyles from '../../styles/page.module.css';
import Image from 'next/image';
import RouteGuard from '../components/RouteGuard';
import { useTranslation } from 'react-i18next';
import { FaEdit, FaPlus, FaTrophy, FaSignOutAlt, FaShieldAlt } from 'react-icons/fa';
import Link from 'next/link';
import StatisticsWidget from '../components/ProfileWidgets/StatisticsWidget';
import useSWR from 'swr';

// Функция для перевода типа канала
function translateBroadcasterType(type, t) {
    return t(`profile_page.broadcaster.${type || 'default'}`, { defaultValue: type });
}


function ProfilePageContent() {
    const { t } = useTranslation();
    const { user, supabase, loading: authLoading, userRole } = useAuth();
  const router = useRouter();
  const twitchUserId = user?.user_metadata?.provider_id;
  const { data, swrError } = useSWR(twitchUserId ? `/api/twitch/user/profile?id=${twitchUserId}` : null, fetcher);
  if (authLoading || !data) return <div>Loading...</div>;
  if (swrError) return <div>Error: {swrError.message}</div>;
  const twitchUserData = data;
    const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  

    const fetchTwitchUserData = useCallback(async () => {
        if (!twitchUserId) {
            setError('Twitch user ID is missing.');
            return;
        }
        try {
            const response = await fetch(`/api/twitch/user/profile?id=${twitchUserId}`);
            if (!response.ok) throw new Error('Failed to fetch Twitch user data');
            const data = await response.json();
            setTwitchUserData(data);
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
            await Promise.all([
                fetchTwitchUserData(),
                // Другие функции загрузки, например, с нашей БД
                // fetchMyDbData(), 
            ]);
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



    if (authLoading || loading) {
        return (
            <div className={pageStyles.loadingContainer}>
                <p>Загрузка профиля...</p>
            </div>
        );
    }
    
    if (error) {
        return <div className={pageStyles.container}><p className={pageStyles.errorMessage}>{error}</p></div>;
    }
    
    if (!user) {
        // Это состояние не должно возникать при использовании RouteGuard, но на всякий случай
        return (
            <div className={pageStyles.container}>
                <p>{t('profile.notWithUs')}</p>
                {/* Можно добавить кнопку для выхода или возврата */}
            </div>
        )
    }

    const displayName = twitchUserData?.display_name || user?.user_metadata?.full_name || t('loading.generic');
    const bio = twitchUserData?.description || t('profile_page.noBio');

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
        const { data: achievementsData, error: achError } = useSWR('/api/achievements', fetcher);
        if (achError) return <div>Error loading achievements</div>;
        const unlockedAchievements = achievementsData?.filter(ach => ach.is_unlocked) || [];
        return (
            <div className={styles.widget}>
                <h3>{t('profile_page.achievements.title')}</h3>
                <ul>
                    {unlockedAchievements.map(ach => (
                        <li key={ach.id}>
                            {ach.name} ({ach.rarity}% rarity)
                        </li>
                    ))}
                </ul>
            </div>
        );
    };

    const ReviewsWidget = () => {
        const [reviews, setReviews] = useState([]);
        const [reviewsLoading, setReviewsLoading] = useState(true);

        useEffect(() => {
            const fetchReviews = async () => {
                if (!twitchUserId) return;
                setReviewsLoading(true);
                try {
                    const response = await fetch(`/api/reviews/streamer/${twitchUserId}`);
                    if (!response.ok) throw new Error('Failed to fetch reviews');
                    const data = await response.json();
                    setReviews(data);
                } catch (error) {
                    console.error("Failed to fetch reviews", error);
                    setError('Error loading reviews');
                } finally {
                    setReviewsLoading(false);
                }
            };
            fetchReviews();
        }, []);

        if (reviewsLoading) {
            return <div className={styles.loadingContainer}><p>Загрузка...</p></div>
  }

  return (
            <div className={styles.widget}>
                <h3>{t('profile_page.reviews.title')}</h3>
                {reviews.length > 0 ? (
                    <ul>
                        {reviews.map(review => (
                            <li key={review.id}>
                                <strong>{review.author}:</strong> &quot;{review.text}&quot; ({'★'.repeat(review.rating)})
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
        const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        let hours = 0;
        let minutes = 0;
        let seconds = 0;

        if (match[1]) hours = parseInt(match[1].replace('H', ''), 10);
        if (match[2]) minutes = parseInt(match[2].replace('M', ''), 10);
        if (match[3]) seconds = parseInt(match[3].replace('S', ''), 10);

        if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    };

    return (
        <div className={pageStyles.container}>
            <header className={styles.profileHeader}>
                <div className={styles.avatarContainer}>
                    <div className="pixel-card">
                        <Image
                            src={twitchUserData?.profile_image_url || user.user_metadata.avatar_url}
                            alt={t('profile_page.avatarAlt', { name: displayName })}
                            width={120}
                            height={120}
                            className={styles.avatar}
                            unoptimized
                        />
                    </div>
                    {twitchUserData?.offline_image_url && (
                        <Image
                            src={twitchUserData.offline_image_url}
                            alt={t('profile_page.offlineBannerAlt', { name: displayName })}
                            layout="fill"
                            objectFit="cover"
                            className={styles.profileBanner}
                        />
                    )}
                </div>
        
                <div className={styles.profileInfo}>
                    <h1>{displayName}</h1>
                    <p className={styles.login}>@{twitchUserData?.login || user.user_metadata.user_name}</p>
                     {twitchUserData?.broadcaster_type && (
                        <p className={styles.broadcasterType}>
                            {translateBroadcasterType(twitchUserData.broadcaster_type, t)}
                        </p>
                     )}
                    <p className={styles.bio}>{bio}</p>

                </div>
                 <div className={styles.profileActions}>
                    <button onClick={() => router.push('/edit-profile')} className={styles.actionButton}>
                        <FaEdit /> {t('profile_page.editProfile')}
                    </button>
                     <button onClick={() => router.push('/reviews/create')} className={styles.actionButton}>
                        <FaPlus /> {t('profile_page.addReview')}
                    </button>
                    <button onClick={() => router.push('/achievements')} className={styles.actionButton}>
                        <FaTrophy /> {t('profile_page.myAchievements')}
                    </button>
                     {userRole === 'admin' && (
                        <button onClick={() => router.push('/admin/reviews')} className={styles.actionButton}>
                            <FaShieldAlt /> {t('profile_page.adminPanel')}
                        </button>
                    )}
                    <button onClick={() => supabase.auth.signOut()} className={`${styles.actionButton} ${styles.logoutButton}`}>
                        <FaSignOutAlt /> {t('logout')}
                    </button>
                 </div>

            </header>

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
  );
}


export default function ProfilePage() {
  return (
    <RouteGuard>
      <ProfilePageContent />
    </RouteGuard>
    )
} 