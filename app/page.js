'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './contexts/AuthContext'; // Импортируем контекст
import styles from '../styles/page.module.css'; // Используем общие стили

export default function HomePage() {
  const { isLoading, isAuthenticated, signInWithTwitch } = useAuth();
  const router = useRouter();
  const [isLoggingIn, setIsLoggingIn] = useState(false); // Состояние для кнопки

  useEffect(() => {
    // Если пользователь уже авторизован и загрузка контекста завершена, редирект в меню
    if (!isLoading && isAuthenticated) {
      console.log('[HomePage] User already authenticated, redirecting to /menu');
      router.replace('/menu');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      // Вызываем функцию входа из контекста
      await signInWithTwitch();
      // Редирект произойдет автоматически через Supabase/AuthContext
    } catch (error) {
      console.error("Login failed:", error);
      // Можно показать сообщение об ошибке пользователю
      alert("Ошибка входа через Twitch. Попробуйте еще раз.");
      setIsLoggingIn(false); // Сбрасываем состояние кнопки при ошибке
    }
    // Не сбрасываем setIsLoggingIn(false) при успехе, т.к. произойдет редирект
  };

  // Не показываем ничего, пока идет проверка авторизации или уже идет редирект
  if (isLoading || isAuthenticated) {
     return (
        <div className={styles.loadingContainer}>
          <div className="spinner"></div>
          <p>Загрузка...</p>
        </div>
      );
  }

  // Показываем контент только если пользователь не авторизован
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>
          Добро пожаловать в <span className={styles.appName}>Streamers Universe!</span>
        </h1>

        <p className={styles.description}>
          Ваша новая платформа для взаимодействия со стримерами, просмотра контента и участия в жизни сообщества.
        </p>

        <button 
          onClick={handleLogin} 
          className={styles.ctaButton} 
          disabled={isLoggingIn} // Блокируем кнопку во время процесса
        >
          {isLoggingIn ? (
            <>
              <span className="spinner button-spinner"></span> Вход...
            </>
          ) : (
            'Войти через Twitch'
          )}
        </button>
      </main>
    </div>
  );
} 