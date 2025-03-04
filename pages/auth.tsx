"use client";

import { useRouter } from 'next/navigation';
import styles from './auth.module.css';

export default function Auth() {
  const router = useRouter();

  const handleLogin = () => {
    router.push('/api/auth/twitch/login');
  };

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
