'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import styles from '../../styles/page.module.css'; // Общие стили

export default function AdminPage() {
  const { userRole, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Ждем окончания загрузки данных об аутентификации
    if (!authLoading) {
      // Если пользователь не админ, перенаправляем его
      if (userRole !== 'admin') {
        router.replace('/menu?error=not_admin');
      }
    }
  }, [authLoading, userRole, router]);

  // Пока идет загрузка или роль не определена как админ, показываем лоадер
  if (authLoading || userRole !== 'admin') {
    return (
      <div className={styles.loadingContainer}>
        <p>Проверка доступа...</p>
      </div>
    );
  }

  // Если все проверки пройдены, показываем контент
  return (
    <div className={styles.container}>
      <h1>Админ-панель</h1>
      <p>Добро пожаловать в панель управления.</p>
      <button
        onClick={() => router.push('/menu')}
        className={styles.backButton}
      >
        &larr; Назад в меню
      </button>
    </div>
  );
}
