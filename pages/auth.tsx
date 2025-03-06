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
      {/* Use next/image component or verify the path is correct */}
      <div className={styles.logoContainer}>
        {/* 
        If using static import:
        <Image 
          src="/assets/logo.png" 
          alt="Streamers Universe Logo" 
          width={200} 
          height={200} 
          className={styles.logo} 
          onError={(e) => {
            console.error('Failed to load logo');
            e.currentTarget.src = '/placeholder-logo.png'; // Fallback image
          }}
        />
        */}
        
        {/* Fallback to regular img tag with error handler */}
        <img 
          className={styles.logo} 
          src="/assets/logo.png" 
          alt="Streamers Universe Logo" 
          onError={(e) => {
            console.error('Failed to load logo');
            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23764ABC"%3E%3C/rect%3E%3Ctext x="50" y="50" font-family="Arial" font-size="12" text-anchor="middle" fill="white"%3ELogo%3C/text%3E%3C/svg%3E';
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
