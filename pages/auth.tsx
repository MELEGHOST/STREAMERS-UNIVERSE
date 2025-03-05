"use client";

import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import styles from './auth.module.css';

export default function Auth() {
  const router = useRouter();

  const handleLogin = () => {
    console.log('Login clicked, pushing to /api/twitch/login');
    try {
      router.push('/api/twitch/login');
    } catch (error) {
      console.error('Error in handleLogin:', error);
    }
  };

  if (Cookies.get('twitch_access_token')) {
    router.push('/profile');
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.stars} />
      <img className={styles.logo} src="/assets/logo.png" alt="Streamers Universe Logo" />
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
