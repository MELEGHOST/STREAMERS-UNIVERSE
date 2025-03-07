"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import { getCookie, hasCookie } from '../utils/cookies';
import styles from './auth.module.css';

export default function Auth() {
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pressStartRef = useRef<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Проверяем, авторизован ли пользователь уже
    const accessToken = getCookie('twitch_access_token');
    if (accessToken) {
      console.log('Обнаружен токен доступа, перенаправление на /profile');
      router.push('/profile');
      return;
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
  }, [router, router.query]);

  const handleLoginPress = (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    e.preventDefault();
    console.log('Button pressed at:', new Date().toISOString());
    pressStartRef.current = Date.now();
    timeoutRef.current = setTimeout(() => {
      console.log('1.42s timeout reached at:', new Date().toISOString());
    }, 1420); // 1.42 секунды
  };

  const handleLoginRelease = (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    e.preventDefault();
    console.log('Button released at:', new Date().toISOString());
    const pressDuration = pressStartRef.current ? Date.now() - pressStartRef.current : 0;
    console.log('Press duration:', pressDuration, 'ms');

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (pressDuration >= 1420) {
      console.log('Long press detected, redirecting to /api/twitch/login');
      try {
        setIsLoading(true); // Показываем индикатор загрузки
        // Очищаем предыдущие сообщения об ошибках
        setErrorMessage('');
        window.location.href = '/api/twitch/login';
      } catch (error) {
        console.error('Ошибка редиректа в handleLoginRelease:', error);
        setErrorMessage('Не удалось перейти на страницу авторизации');
        setIsLoading(false);
      }
    } else {
      console.log('Press too short, no redirect');
    }
    pressStartRef.current = null;
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
          className={`${styles.spaceButton} ${isLoading ? styles.loading : ''}`}
          onMouseDown={handleLoginPress}
          onMouseUp={handleLoginRelease}
          onMouseLeave={handleLoginRelease}
          onTouchStart={handleLoginPress}
          onTouchEnd={handleLoginRelease}
          onClick={(e) => e.preventDefault()} // Блокируем простое нажатие
          disabled={isLoading}
        >
          <span className={styles.backdrop}></span>
          <span className={styles.galaxy}></span>
          <label className={styles.text}>
            {isLoading ? 'Загрузка...' : 'Войти через Twitch'}
          </label>
        </button>
        <div className={styles.bodydrop}></div>
      </div>
      
      {isLoading && (
        <div className={styles.loadingText}>
          Переход на авторизацию Twitch...
        </div>
      )}
    </div>
  );
}
