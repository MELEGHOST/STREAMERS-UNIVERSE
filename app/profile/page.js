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

// Функция для перевода типа канала
function translateBroadcasterType(type, t) {
    return t(`profile_page.broadcaster.${type || 'default'}`, { defaultValue: type });
}


function ProfilePageContent() {
    const { t } = useTranslation();
    const { user, supabase, loading: authLoading, userRole } = useAuth();
  const [twitchUserData, setTwitchUserData] = useState(null);
    const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
    const router = useRouter();
  
  const twitchUserId = user?.user_metadata?.provider_id;

    const fetchTwitchUserData = useCallback(async () => {
        if (!twitchUserId) {
            console.warn("[ProfilePage] Отсутствует twitchUserId, загрузка Twitch данных невозможна.");
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
          console.warn("[ProfilePage] Отсутствует user, supabase или twitchUserId, загрузка прервана.");
            setLoading(false);
          return;
      }
      
      console.log(`[ProfilePage] Загрузка ВСЕХ данных для twitchUserId: ${twitchUserId}, userId: ${user.id}`);
        setLoading(true);
      setError(null);

        // Параллельная загрузка
        await Promise.all([
            fetchTwitchUserData(),
            // Другие функции загрузки, например, с нашей БД
            // fetchMyDbData(), 
        ]);

        setLoading(false);

    }, [user, supabase, twitchUserId, fetchTwitchUserData]);


    useEffect(() => {
        // Ждем окончания загрузки аутентификации
        if (!authLoading) {
            fetchAllData();
        }
    }, [authLoading, fetchAllData]);



    if (authLoading || loading) {
        return (
            <div className={pageStyles.loadingContainer}>
                <div className="spinner"></div>
                <p>{t('loading.profile')}</p>
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
        // Mock data, replace with real achievements logic
        const achievements = [
            { id: 1, name: t('profile_page.achievements.firstReview'), unlocked: true },
            { id: 2, name: t('profile_page.achievements.firstFollower'), unlocked: false },
            { id: 3, name: t('profile_page.achievements.inspirer'), unlocked: true },
        ];
        // Можно вынести в отдельный компонент AchievementsWidget
        return (
            <div className={styles.widget}>
                <h3>{t('profile_page.achievements.title')}</h3>
                <ul>
                    {achievements.map(ach => (
                        <li key={ach.id} className={ach.unlocked ? styles.unlocked : styles.locked}>
                            {ach.name} ({ach.unlocked ? t('profile_page.achievements.unlocked') : t('profile_page.achievements.locked')})
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
                    // Предполагается, что есть API эндпоинт для получения отзывов по twitchId
                    // const response = await fetch(`/api/reviews/streamer/${twitchUserId}`);
                    // const data = await response.json();
                    // setReviews(data);

                    // Mock data
                    setReviews([
                        { id: 1, author: 'User123', text: 'Отличный стример, очень интересно смотреть!', rating: 5 },
                        { id: 2, author: 'PlayerX', text: 'Иногда бывает скучно, но в целом неплохо.', rating: 4 },
                    ]);

      } catch (error) {
                    console.error("Failed to fetch reviews", error);
                } finally {
                    setReviewsLoading(false);
                }
            };
            fetchReviews();
        }, [twitchUserId]);

        if (reviewsLoading) {
            return <div className={styles.loadingContainer}><div className="spinner"></div><p>{t('loading.generic')}</p></div>
  }

  return (
            <div className={styles.widget}>
                <h3>{t('profile_page.reviews.title')}</h3>
                {reviews.length > 0 ? (
                    <ul>
                        {reviews.map(review => (
                            <li key={review.id}>
                                <strong>{review.author}:</strong> "{review.text}" ({'★'.repeat(review.rating)})
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


    return (
        <div className={pageStyles.container}>
            <header className={styles.profileHeader}>
                <div className={styles.avatarContainer}>
                    <Image
                        src={twitchUserData?.profile_image_url || user.user_metadata.avatar_url}
                        alt={t('profile_page.avatarAlt', { name: displayName })}
                        width={120}
                        height={120}
                        className={styles.avatar}
                        unoptimized
                    />
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