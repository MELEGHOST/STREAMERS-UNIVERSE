"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import styles from './auth.module.css';

export default function Auth() {
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isPressing, setIsPressing] = useState(false);

  useEffect(() => {
    // Проверяем, авторизован ли пользователь уже
    const accessToken = Cookies.get('twitch_access_token');
    if (accessToken) {
      router.push('/profile');
    }

    // Проверяем наличие ошибки авторизации
    const { error, message } = router.query;
    if (error) {
      console.error('Ошибка авторизации:', error);
      if (message) {
        const messageStr = Array.isArray(message) ? message[0] : message;
        setErrorMessage(decodeURIComponent(messageStr));
      } else {
        setErrorMessage('Произошла ошибка при авторизации через Twitch');
      }
    }
  }, [router]);

  const handleLoginPress = (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsPressing(true);
    timeoutRef.current = setTimeout(() => {
      if (isPressing) {
        console.log('Long press detected, redirecting to /api/twitch/login');
        try {
          window.location.href = '/api/twitch/login';
        } catch (error) {
          console.error('Ошибка редиректа в handleLoginPress:', error);
          setErrorMessage('Не удалось перейти на страницу авторизации');
        }
      }
    }, 1420); // 1.42 секунды
  };

  const handleLoginRelease = (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsPressing(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.stars} />
      
      <div className={styles.logoContainer}>
        <img 
          className={styles.logo} 
          src="/logo.png" 
          alt="Streamers Universe Logo" 
          onError={(e) => {
            console.error('Не удалось загрузить логотип, использую плейсхолдер');
            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%237B41C9"%3E%3C/rect%3E%3Ctext x="100" y="100" font-family="Arial" font-size="24" text-anchor="middle" fill="white"%3EStreamers Universe%3C/text%3E%3C/svg%3E';
          }}
        />
      </div>
      
      {errorMessage && (
        <div className={styles.errorMessage}>
          {errorMessage}
        </div>
      )}
      
      <div className={styles.galaxyButton}>
        <button
          className={styles.spaceButton}
          onMouseDown={handleLoginPress}
          onMouseUp={handleLoginRelease}
          onMouseLeave={handleLoginRelease}
          onTouchStart={handleLoginPress}
          onTouchEnd={handleLoginRelease}
          onClick={(e) => e.preventDefault()} // Блокируем простое нажатие
        >
          <span className={styles.backdrop}></span>
          <span className={styles.galaxy}></span>
          <label className={styles.text}>Войти через Twitch</label>
        </button>
      </div>
    </div>
  );
}
