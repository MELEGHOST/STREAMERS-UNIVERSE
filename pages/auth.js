"use client";

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import styles from './auth.module.css';

export default function Auth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const handleLogin = async () => {
    try {
      console.log('Initiating Twitch login');
      const result = await signIn('twitch', { callbackUrl: '/profile', redirect: true });
      if (!result?.ok) {
        throw new Error('Failed to initiate Twitch login');
      }
      // Сохраняем токен и пользователя в localStorage после успешной авторизации
      if (result.ok && result.user) {
        localStorage.setItem('twitchToken', result.accessToken || '');
        localStorage.setItem('twitchUser', JSON.stringify(result.user));
      }
    } catch (error) {
      console.error('Error initiating Twitch login:', error);
      alert('Не удалось войти через Twitch. Проверь настройки или попробуй позже.');
    }
  };

  // Если сессия загружается, показываем загрузку
  if (status === 'loading') {
    return <div>Загрузка...</div>;
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
