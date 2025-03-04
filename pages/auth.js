"use client";

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import styles from './auth.module.css';

export default function Auth() 
  const { data: session, status } = useSession();
  const router = useRouter();

  const handleLogin = async () => {
    try {
      console.log('Initiating Twitch login with session status:', status);
      await signIn('twitch', { callbackUrl: '/profile' });
      // NextAuth автоматически перенаправляет пользователя и управляет сессией
    } catch (error) {
      console.error('Error initiating Twitch login:', {
        error,
        message: error.message,
        stack: error.stack,
      });
      alert('Не удалось войти через Twitch. Проверь настройки или попробуй позже.');
    }
  };

  // Если сессия загружается, показываем загрузку
  if (status === 'loading') {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  // Если пользователь авторизован, перенаправляем на /profile
  if (session) {
    router.push('/profile');
    return null; // Возвращаем null, пока редирект не завершён
  }

  return (
    <div className={styles.container}>
      <div className={styles.stars} />
      <img className={styles.logo} src="/logo.png" alt="Streamers Universe Logo" />
      <div className={styles.galaxyButton}>
        <button className={styles.spaceButton} onClick={handleLogin}>
          <span className={styles.backdrop}></span>
          <span className={styles.galaxy}></span>
          <label className={styles.text}>Войти через Twitch</label>
        </button>
      </div>
    </div>
  );
}
