'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './followings.module.css';
import pageStyles from '../../styles/page.module.css';
import { useTranslation } from 'react-i18next';
import RouteGuard from '../components/RouteGuard';
import { FaArrowLeft } from 'react-icons/fa';

function FollowingsPageContent() {
    const { t } = useTranslation();
    const { user, supabase, isLoading: authLoading } = useAuth();
    const [followings, setFollowings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const router = useRouter();


    const fetchFollowings = useCallback(async () => {
        if (!user || !supabase) return;

        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error(t('my_reviews.authRequired'));
            }
            const token = session.access_token;

            const response = await fetch('/api/twitch/user/followings', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || t('profile_page.failedToFetch'));
            }

            const data = await response.json();
            setFollowings(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [user, supabase, t]);

    useEffect(() => {
        fetchFollowings();
    }, [fetchFollowings]);

    if (loading || authLoading) {
        return (
            <div className={pageStyles.loadingContainer}>
                <p>Загрузка подписок...</p>
            </div>
        );
    }
    
    // Этот блок больше не нужен, т.к. RouteGuard обрабатывает это
    // if (!user) {
    //     return (
    //         <div className={pageStyles.loadingContainer}>
    //             <div className="spinner"></div><p>{t('loading.page')}</p>
    //         </div>
    //     );
    // }

    return (
        <div className={pageStyles.container}>
            <header className={styles.header}>
                <button onClick={() => router.back()} className={styles.backButton}>
                    <FaArrowLeft /> {t('common.back')}
                </button>
                <h1 className={styles.title}>{t('profile_page.followingsTitle')} ({followings.length})</h1>
            </header>

            {error && <p className={pageStyles.errorMessage}>{t('common.error')}: {error}</p>}

            {followings.length > 0 ? (
                <div className={styles.grid}>
                    {followings.map((following) => (
                        <Link key={following.id} href={`/profile/${following.id}`} className={styles.card}>
                             <Image
                                src={following.profilePictureUrl || '/default-avatar.png'}
                                alt={`${t('profile_page.avatarAlt', { name: following.displayName })}`}
                                width={80}
                                height={80}
                                className={styles.avatar}
                                unoptimized
                            />
                            <h2 className={styles.name}>{following.displayName}</h2>
                            <p className={styles.login}>@{following.login}</p>
                            {following.isLive && (
                                <div className={styles.liveIndicator}>LIVE</div>
                            )}
                        </Link>
                    ))}
                </div>
            ) : (
                !error && <p>{t('profile_page.noFollowings')}</p>
            )}
        </div>
    );
}

export default function FollowingsPage() {
    return (
        <RouteGuard>
            <FollowingsPageContent />
        </RouteGuard>
    )
} 