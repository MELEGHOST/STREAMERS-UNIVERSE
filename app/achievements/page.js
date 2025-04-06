'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import styles from '../../styles/page.module.css'; // Используем общие стили

export default function AchievementsPage() {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const title = "Достижения";

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log(`[${title} Page] Not authenticated, redirecting to auth`);
      router.push(`/auth?next=/achievements`);
    }
  }, [isLoading, isAuthenticated, router, title]);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className="spinner"></div><p>Загрузка...</p>
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
      <p>Этот раздел находится в разработке.</p>
      <p>Здесь будут отображаться ваши достижения как зрителя или стримера.</p>
       <button onClick={() => router.back()} className={styles.backButton}>
            &larr; Назад
       </button>
    </div>
  );
} 