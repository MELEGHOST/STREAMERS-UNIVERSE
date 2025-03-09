'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import { getCookie, hasCookie, getCookieWithLocalStorage, setCookieWithLocalStorage } from '../utils/cookies';
import styles from './auth.module.css';
import { useAuth } from '../contexts/AuthContext';

export default function Auth() {
  const router = useRouter();
  const { login } = useAuth();
  const timeoutRef = useRef(null);
  const pressStartRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Упрощенная проверка авторизации
    const checkAuthStatus = () => {
      // Собираем отладочную информацию
      const debug = {
        cookies: {
          twitch_access_token: hasCookie('twitch_access_token'),
          twitch_refresh_token: hasCookie('twitch_refresh_token'),
          twitch_user: hasCookie('twitch_user'),
          twitch_token: hasCookie('twitch_token'),
        },
        localStorage: {
          cookie_twitch_access_token: !!localStorage.getItem('cookie_twitch_access_token'),
          cookie_twitch_refresh_token: !!localStorage.getItem('cookie_twitch_refresh_token'),
          cookie_twitch_user: !!localStorage.getItem('cookie_twitch_user'),
          twitch_user: !!localStorage.getItem('twitch_user'),
          is_authenticated: !!localStorage.getItem('is_authenticated'),
        }
      };
      
      setDebugInfo(debug);
      
      // Очищаем устаревшие токены при загрузке страницы авторизации
      if (typeof window !== 'undefined') {
        // Проверяем, есть ли параметр clear_auth или logged_out в URL
        const urlParams = new URLSearchParams(window.location.search);
        const clearAuth = urlParams.get('clear_auth') === 'true';
        const loggedOut = urlParams.get('logged_out') === 'true';
        
        // Если есть параметр logged_out или clear_auth, очищаем данные авторизации
        if (clearAuth || loggedOut) {
          console.log('Очищаем данные авторизации по запросу');
          
          // Очищаем куки напрямую через document.cookie
          document.cookie = 'twitch_access_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
          document.cookie = 'twitch_refresh_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
          document.cookie = 'twitch_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
          document.cookie = 'twitch_user=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
          document.cookie = 'twitch_auth_state=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
          
          // Используем библиотеку js-cookie для дополнительного надежного удаления
          Cookies.remove('twitch_access_token');
          Cookies.remove('twitch_refresh_token');
          Cookies.remove('twitch_user');
          Cookies.remove('twitch_token');
          
          // Очищаем localStorage и sessionStorage
          localStorage.removeItem('twitch_user');
          localStorage.removeItem('cookie_twitch_access_token');
          localStorage.removeItem('cookie_twitch_refresh_token');
          localStorage.removeItem('cookie_twitch_user');
          localStorage.removeItem('is_authenticated');
          localStorage.removeItem('logged_out');
          
          // Удаляем параметр из URL
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('clear_auth');
          newUrl.searchParams.delete('logged_out');
          window.history.replaceState({}, document.title, newUrl.toString());
          
          // Отображаем сообщение о выходе, если был параметр logged_out
          if (loggedOut) {
            setErrorMessage('Вы успешно вышли из системы.');
          }
          return;
        }
      }
      
      // Проверяем, авторизован ли пользователь уже
      const accessToken = getCookieWithLocalStorage('twitch_access_token') || 
                          localStorage.getItem('cookie_twitch_access_token') || 
                          Cookies.get('twitch_token');
                          
      const userData = getCookieWithLocalStorage('twitch_user') || 
                       localStorage.getItem('cookie_twitch_user') || 
                       localStorage.getItem('twitch_user');
      
      console.log('Auth: Проверка авторизации', {
        hasAccessToken: !!accessToken,
        hasUserData: !!userData
      });
      
      if (accessToken && userData) {
        console.log('Обнаружен токен доступа и данные пользователя, перенаправление на /menu');
        
        // Сохраняем текущий домен перед редиректом
        if (typeof window !== 'undefined') {
          localStorage.setItem('current_domain', window.location.origin);
        }
        
        // Устанавливаем флаг авторизации
        localStorage.setItem('is_authenticated', 'true');
        
        // Обновляем контекст авторизации
        try {
          const parsedUserData = typeof userData === 'string' ? JSON.parse(userData) : userData;
          if (login) {
            login(accessToken, parsedUserData);
          }
        } catch (error) {
          console.error('Ошибка при обновлении контекста авторизации:', error);
        }
        
        // Устанавливаем флаг перенаправления
        setRedirecting(true);
        
        // Простое перенаправление без анимации
        window.location.href = '/menu';
        return;
      }
    };
    
    // Проверяем состояние авторизации при загрузке страницы
    checkAuthStatus();

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
  }, [router, router.query, login]);

  const handleLoginClick = (e) => {
    e.preventDefault();
    // Упрощенная логика клика - сразу начинаем авторизацию
    setIsLoading(true);
    setErrorMessage('');
    handleLoginComplete();
  };

  const handleLoginPress = (e) => {
    e.preventDefault();
    console.log('Button pressed at:', new Date().toISOString());
    pressStartRef.current = Date.now();
    timeoutRef.current = setTimeout(() => {
      console.log('1.42s timeout reached at:', new Date().toISOString());
      setIsLoading(true);
      setErrorMessage('');
      handleLoginComplete();
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
    
    try {
      // Очищаем все куки и localStorage перед авторизацией
      Cookies.remove('twitch_access_token');
      Cookies.remove('twitch_refresh_token');
      Cookies.remove('twitch_user');
      Cookies.remove('twitch_token');
      localStorage.removeItem('twitch_user');
      localStorage.removeItem('cookie_twitch_access_token');
      localStorage.removeItem('cookie_twitch_refresh_token');
      localStorage.removeItem('cookie_twitch_user');
      localStorage.removeItem('is_authenticated');
      
      // Сохраняем текущий домен перед редиректом
      if (typeof window !== 'undefined') {
        localStorage.setItem('current_domain', window.location.origin);
      }
      
      // Используем правильный URL для авторизации
      window.location.href = '/api/twitch/login';
    } catch (error) {
      console.error('Ошибка при перенаправлении на страницу авторизации:', error);
      setErrorMessage('Произошла ошибка при перенаправлении на страницу авторизации. Пожалуйста, попробуйте еще раз.');
      setIsLoading(false);
    }
  };

  // Если идет перенаправление, показываем индикатор загрузки
  if (redirecting) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Перенаправление в меню...</p>
        </div>
      </div>
    );
  }

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
        
        <div>
          <p>Здесь вы сможете погрузиться в мир стриминга, найти своих любимых стримеров и стать частью сообщества.</p>
          <p>Присоединяйтесь к нам и откройте для себя новые возможности!</p>
        </div>
      </div>
      
      {errorMessage && (
        <div className={styles.errorMessage}>
          {errorMessage}
        </div>
      )}
      
      <div className={styles.authButtonsContainer}>
        <button 
          className={styles.normalLoginButton}
          onClick={handleLoginClick}
          disabled={isLoading}
        >
          {isLoading ? 'Авторизация...' : 'Войти через Twitch'}
        </button>
        
        <div className={styles.galaxyButton}>
          <button 
            className={styles.spaceButton}
            onMouseDown={handleLoginPress}
            onMouseUp={handleLoginRelease}
            onTouchStart={handleLoginPress}
            onTouchEnd={handleLoginRelease}
            disabled={isLoading}
          >
            {isLoading ? 'Авторизация...' : 'Войти через Twitch'}
            <div className={styles.spaceBtnGlow}></div>
            <div className={styles.spaceBtnGlare}></div>
          </button>
        </div>
      </div>
      
      {isLoading && (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Переход на страницу авторизации Twitch...</p>
        </div>
      )}
      
      <div className={styles.infoSection}>
        <details>
          <summary>Зачем нужна авторизация через Twitch?</summary>
          <div className={styles.infoContent}>
            <p>Авторизация через Twitch нужна для получения базовой информации о вашем аккаунте:</p>
            <ul>
              <li>Имя пользователя и аватар</li>
              <li>Список подписчиков и подписок</li>
              <li>Статистика канала</li>
            </ul>
            <p>Мы не получаем доступ к вашему паролю и не можем управлять вашим каналом.</p>
          </div>
        </details>
      </div>
    </div>
  );
} 