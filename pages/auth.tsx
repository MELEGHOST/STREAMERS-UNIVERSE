"use client";

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './auth.module.css';

export default function Auth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const handleLogin = async () => {
    try {
      console.log('Initiating Twitch login with session status:', status);
      await signIn('twitch', { callbackUrl: '/profile' });
    } catch (error) {
      console.error('Error initiating Twitch login:', error);
      alert('Не удалось войти через Twitch. Проверь настройки или попробуй позже.');
    }
  };

  if (status === 'loading') {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (session) {
    router.push('/profile');
    return null;
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
