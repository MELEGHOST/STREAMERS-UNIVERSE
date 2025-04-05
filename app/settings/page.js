'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import styles from '../../styles/page.module.css'; // Используем общие стили

export default function SettingsPage() {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const title = "Настройки";

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log(`[${title} Page] Not authenticated, redirecting to auth`);
      router.push(`/auth?next=/settings`);
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
      <button onClick={() => router.push('/menu')} className={styles.backButton}>
        &larr; Назад в меню
      </button>
    </div>
  );
} 