'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './followers.module.css';
import pageStyles from '../../styles/page.module.css';
import { useTranslation } from 'react-i18next';
import RouteGuard from '../components/RouteGuard';
import { FaArrowLeft } from 'react-icons/fa';

function FollowersPageContent() {
    const { t } = useTranslation();
    const { user, supabase } = useAuth();
    const [followers, setFollowers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const router = useRouter();

    const fetchFollowers = useCallback(async () => {
        if (!user || !supabase) return;

        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error(t('my_reviews.authRequired'));
            }
            const token = session.access_token;

            const response = await fetch('/api/twitch/user/followers', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || t('profile_page.failedToFetchFollowers'));
            }

            const data = await response.json();
            setFollowers(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [user, supabase, t]);

    useEffect(() => {
        fetchFollowers();
    }, [fetchFollowers]);

    if (loading) {
        return (
            <div className={pageStyles.loadingContainer}>
                <div className="spinner"></div><p>{t('loading.followers')}</p>
            </div>
        );
    }

    return (
        <div className={pageStyles.container}>
            <header className={styles.header}>
                <button onClick={() => router.back()} className={styles.backButton}>
                    <FaArrowLeft /> {t('achievements_page.backButton')}
                </button>
                <h1 className={styles.title}>{t('profile_page.followersTitle')} ({followers.length})</h1>
            </header>

            {error && <p className={pageStyles.errorMessage}>{t('common.error')}: {error}</p>}

            {followers.length > 0 ? (
                <div className={styles.grid}>
                    {followers.map((follower) => (
                        <Link key={follower.id} href={`/profile/${follower.id}`} className={styles.card}>
                             <Image
                                src={follower.profilePictureUrl || '/default-avatar.png'}
                                alt={t('profile_page.avatarAlt', { name: follower.displayName })}
                                width={80}
                                height={80}
                                className={styles.avatar}
                                unoptimized
                            />
                            <h2 className={styles.name}>{follower.displayName}</h2>
                            <p className={styles.login}>@{follower.login}</p>
                        </Link>
                    ))}
                </div>
            ) : (
                !error && <p>{t('profile_page.noFollowers')}</p>
            )}
        </div>
    );
}

export default function FollowersPage() {
    return (
        <RouteGuard>
            <FollowersPageContent />
        </RouteGuard>
    )
} 