'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import { getCookie, hasCookie, getCookieWithLocalStorage, setCookieWithLocalStorage } from '../utils/cookies';
import styles from './auth.module.css';

export default function Auth() {
  const router = useRouter();
  const timeoutRef = useRef(null);
  const pressStartRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Очищаем устаревшие токены при загрузке страницы авторизации
    if (typeof window !== 'undefined') {
      // Проверяем, есть ли параметр clear_auth в URL
      const urlParams = new URLSearchParams(window.location.search);
      const clearAuth = urlParams.get('clear_auth') === 'true';
      
      if (clearAuth) {
        console.log('Очищаем данные авторизации по запросу');
        Cookies.remove('twitch_access_token');
        Cookies.remove('twitch_refresh_token');
        Cookies.remove('twitch_user');
        localStorage.removeItem('twitch_user');
        localStorage.removeItem('cookie_twitch_access_token');
        localStorage.removeItem('cookie_twitch_refresh_token');
        localStorage.removeItem('cookie_twitch_user');
        
        // Удаляем параметр из URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('clear_auth');
        window.history.replaceState({}, document.title, newUrl.toString());
      }
    }
    
    // Проверяем, авторизован ли пользователь уже
    const accessToken = getCookieWithLocalStorage('twitch_access_token');
    if (accessToken) {
      console.log('Обнаружен токен доступа, перенаправление на /menu');
      
      // Сохраняем текущий домен перед редиректом
      if (typeof window !== 'undefined') {
        localStorage.setItem('current_domain', window.location.origin);
        
        // Также сохраняем токен в localStorage для надежности
        localStorage.setItem('cookie_twitch_access_token', accessToken);
      }
      
      // Добавляем плавный переход перед редиректом
      document.body.style.opacity = '0';
      document.body.style.transition = 'opacity 0.3s ease';
      
      // Используем абсолютный URL для редиректа
      setTimeout(() => {
        const currentOrigin = window.location.origin;
        const targetUrl = new URL('/menu', currentOrigin);
        
        // Добавляем параметр для плавного перехода
        targetUrl.searchParams.set('smooth', 'true');
        
        window.location.href = targetUrl.toString();
      }, 300);
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

  const handleLoginPress = (e) => {
    e.preventDefault();
    console.log('Button pressed at:', new Date().toISOString());
    pressStartRef.current = Date.now();
    timeoutRef.current = setTimeout(() => {
      console.log('1.42s timeout reached at:', new Date().toISOString());
    }, 1420); // 1.42 секунды
  };

  const handleLoginRelease = (e) => {
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
        handleLoginComplete();
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

  const handleLoginComplete = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setIsLoading(true);
    console.log('Начинаем авторизацию через Twitch...');
    
    // Сохраняем текущий домен перед редиректом
    if (typeof window !== 'undefined') {
      localStorage.setItem('current_domain', window.location.origin);
    }
    
    // Используем правильный URL для авторизации
    window.location.href = '/api/twitch/login';
  };

  return (
    <div className={styles.container}>
      <div className={styles.stars} />
      
      <div className={styles.welcomeSection}>
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
        
        <h1 className={styles.welcomeTitle}>Добро пожаловать в Streamers Universe</h1>
        
        <div className={styles.welcomeText}>
          <p>Здесь вы сможете погрузиться в мир стриминга, найти своих любимых стримеров и стать частью сообщества.</p>
          <p>Присоединяйтесь к нам и откройте для себя новые возможности!</p>
        </div>
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
          onTouchStart={handleLoginPress}
          onTouchEnd={handleLoginRelease}
          disabled={isLoading}
        >
          <span className={styles.backdrop}></span>
          <span className={styles.galaxy}></span>
          <label className={styles.text}>
            {isLoading ? 'Подключение...' : 'Войти через Twitch'}
          </label>
        </button>
        <div className={styles.bodydrop}></div>
      </div>
      
      <div className={styles.instructions}>
        <p>Нажмите и удерживайте кнопку для входа</p>
        <div className={styles.pulseAnimation}></div>
      </div>
      
      <div className={styles.features}>
        <div className={styles.featureItem}>
          <div className={styles.featureIcon}>🔍</div>
          <h3>Поиск стримеров</h3>
          <p>Находите новых и интересных стримеров</p>
        </div>
        <div className={styles.featureItem}>
          <div className={styles.featureIcon}>👥</div>
          <h3>Сообщество</h3>
          <p>Станьте частью растущего сообщества</p>
        </div>
        <div className={styles.featureItem}>
          <div className={styles.featureIcon}>🚀</div>
          <h3>Возможности</h3>
          <p>Откройте для себя новые возможности</p>
        </div>
      </div>
    </div>
  );
} 