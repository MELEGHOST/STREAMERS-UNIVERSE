'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import styles from '../../styles/page.module.css'; // Используем общие стили
import RouteGuard from '../components/RouteGuard';
import Link from 'next/link';
import Image from 'next/image';

function FollowingsPageContent() {
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const title = "Вдохновители";

  const [channels, setChannels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      console.log(`[${title} Page] Not authenticated, redirecting to auth`);
      router.push(`/auth?next=/followings`);
    }
  }, [isAuthLoading, isAuthenticated, router, title]);

  useEffect(() => {
    if (isAuthenticated) {
      const fetchFollowings = async () => {
        try {
          setIsLoading(true);
          const response = await fetch('/api/twitch/user/followings');
          if (!response.ok) {
            throw new Error('Не удалось загрузить список подписок.');
          }
          const data = await response.json();
          setChannels(data);
        } catch (err) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchFollowings();
    }
  }, [isAuthenticated]);

  if (isAuthLoading || (isLoading && isAuthenticated)) {
    return (
      <div className={styles.loadingContainer}>
        <div className="spinner"></div><p>Загрузка списка вдохновителей...</p>
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
      <h1>{title}</h1>
      
      {error && <p className={styles.errorText}>Ошибка: {error}</p>}
      
      <div className={styles.channelsGrid}>
        {channels.length > 0 ? (
          channels.map(channel => (
            <Link key={channel.id} href={`/profile/${channel.login}`} className={styles.channelCard}>
              <Image 
                src={channel.profilePictureUrl} 
                alt={channel.displayName} 
                width={80}
                height={80}
                className={styles.channelAvatar} 
              />
              <div className={styles.channelInfo}>
                <span className={styles.channelName}>{channel.displayName}</span>
                {channel.isLive && <span className={styles.liveIndicator}>В ЭФИРЕ</span>}
              </div>
              {channel.isLive && <p className={styles.streamTitle}>{channel.title}</p>}
            </Link>
          ))
        ) : (
          !isLoading && <p>Вы пока ни на кого не подписаны на Twitch.</p>
        )}
      </div>

      <button onClick={() => router.push('/menu')} className={styles.backButton}>
        &larr; Назад в меню
      </button>
    </div>
  );
}

export default function FollowingsPage() {
  return (
    <RouteGuard>
      <FollowingsPageContent />
    </RouteGuard>
  );
} 