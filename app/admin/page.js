'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import styles from '../../styles/page.module.css'; // Общие стили

export default function AdminPage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user) {
      const checkAdmin = async () => {
        setCheckingAdmin(true);
        try {
          const response = await fetch('/api/auth/check-admin');
          if (response.ok) {
            const data = await response.json();
            if (!data.isAdmin) {
                console.warn('[Admin Page] User is not admin, redirecting to menu.');
                router.push('/menu?error=not_admin');
            }
          } else {
             console.error('[Admin Page] Error checking admin status:', response.status);
             router.push('/menu?error=admin_check_failed'); // Редирект при ошибке проверки
          }
        } catch (error) {
          console.error('[Admin Page] Exception checking admin status:', error);
          router.push('/menu?error=admin_check_exception');
        } finally {
           setCheckingAdmin(false);
        }
      };
      checkAdmin();
    }
  }, [isAuthenticated, user, router]);

  if (checkingAdmin) {
    return (
      <div className={styles.loadingContainer}>
        <div className="spinner"></div>
        <p>Проверка роли администратора...</p>
      </div>
    );
  }

  // Если пользователь - админ
  return (
    <div className={styles.container}>
      <h1>Админ-панель</h1>
      <p>Добро пожаловать в панель управления.</p>
      {/* Здесь будет контент админ-панели */}
       <button onClick={() => router.push('/menu')} className={styles.backButton}>
        &larr; Назад в меню
      </button>
    </div>
  );
} 