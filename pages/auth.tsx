"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import styles from './auth.module.css';

export default function Auth() {
  const router = useRouter();

  useEffect(() => {
    // Check if already authenticated
    const accessToken = Cookies.get('twitch_access_token');
    if (accessToken) {
      router.push('/profile');
    }
  }, [router]);

  const handleLogin = () => {
    try {
      // Direct navigation to the login API
      window.location.href = '/api/twitch/login';
    } catch (error) {
      console.error('Error in handleLogin:', error);
    }
  };

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
