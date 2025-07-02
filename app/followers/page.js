'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import styles from '../../styles/page.module.css'; // Используем общие стили
import RouteGuard from '../components/RouteGuard';
import { useTranslation } from 'react-i18next';

function FollowersPageContent() {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log(`[${t('profile_page.followersTitle')} Page] Not authenticated, redirecting to auth`);
      router.push(`/auth?next=/followers`);
    }
  }, [isLoading, isAuthenticated, router, t]);

  useEffect(() => {
    // Mock data
    const mockFollowers = [
      { id: 1, name: t('profile_page.followerName', { number: 1 }) },
      { id: 2, name: t('profile_page.followerName', { number: 2 }) },
    ];
    setFollowers(mockFollowers);
    setLoading(false);
  }, [t]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className="spinner"></div><p>{t('loading.generic')}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.loadingContainer}>
        <p>Перенаправление на страницу входа...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1>{t('profile_page.followersTitle')}</h1>
      <ul>
        {followers.map(follower => (
          <li key={follower.id}>{follower.name}</li>
        ))}
      </ul>
      <button onClick={() => router.push('/menu')} className={styles.backButton}>
        &larr; Назад в меню
      </button>
    </div>
  );
}

export default function FollowersPage() {
  return (
    <RouteGuard>
      <FollowersPageContent />
    </RouteGuard>
  );
} 