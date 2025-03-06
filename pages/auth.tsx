"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import styles from './auth.module.css';
import Image from 'next/image'; // Use Next.js Image component for better optimization

export default function Auth() {
  const router = useRouter();

  useEffect(() => {
    // Check if already authenticated
    const accessToken = Cookies.get('twitch_access_token');
    if (accessToken) {
      router.push('/profile');
    }
    
    // Check for auth error
    const { error } = router.query;
    if (error) {
      console.error('Authentication error:', error);
      // You could display an error message to the user here
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
      
      <div className={styles.logoContainer}>
        {/* Используем гарантированное изображение или плейсхолдер */}
        <img 
          className={styles.logo} 
          src="/logo.png" // Исправлен путь к логотипу - убран каталог assets/
          alt="Streamers Universe Logo" 
          onError={(e) => {
            console.error('Не удалось загрузить логотип, использую плейсхолдер');
            // Использование инлайн SVG как плейсхолдер
            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%237B41C9"%3E%3C/rect%3E%3Ctext x="100" y="100" font-family="Arial" font-size="24" text-anchor="middle" fill="white"%3EStreamers Universe%3C/text%3E%3C/svg%3E';
          }}
        />
      </div>
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
