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
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    // Проверяем, нужно ли выполнить проверку авторизации после редиректа
    if (typeof window !== 'undefined' && sessionStorage.getItem('check_auth_after_redirect') === 'true') {
      console.log('Выполняем проверку авторизации после редиректа...');
      sessionStorage.removeItem('check_auth_after_redirect');
      
      // Даем время на установку куков
      setTimeout(() => {
        const accessToken = getCookieWithLocalStorage('twitch_access_token');
        const userData = getCookieWithLocalStorage('twitch_user');
        
        console.log('Проверка после редиректа:', {
          accessToken: accessToken ? 'присутствует' : 'отсутствует',
          userData: userData ? 'присутствует' : 'отсутствует'
        });
        
        if (accessToken && userData) {
          console.log('Авторизация успешна, данные пользователя получены');
          localStorage.setItem('is_authenticated', 'true');
          
          // Перенаправляем на главную страницу
          const currentOrigin = window.location.origin;
          const targetUrl = new URL('/menu', currentOrigin);
          targetUrl.searchParams.set('smooth', 'true');
          window.location.href = targetUrl.toString();
        } else {
          console.log('Авторизация не удалась или данные пользователя не получены');
          localStorage.removeItem('is_authenticated');
          setErrorMessage('Данные пользователя не найдены. Пожалуйста, авторизуйтесь снова.');
          setIsLoading(false);
        }
      }, 1000);
    }
    
    // Функция для проверки состояния авторизации
    const checkAuthStatus = () => {
      // Собираем отладочную информацию
      const debug = {
        cookies: {
          twitch_access_token: hasCookie('twitch_access_token'),
          twitch_refresh_token: hasCookie('twitch_refresh_token'),
          twitch_user: hasCookie('twitch_user'),
        },
        localStorage: {
          cookie_twitch_access_token: !!localStorage.getItem('cookie_twitch_access_token'),
          cookie_twitch_refresh_token: !!localStorage.getItem('cookie_twitch_refresh_token'),
          cookie_twitch_user: !!localStorage.getItem('cookie_twitch_user'),
          twitch_user: !!localStorage.getItem('twitch_user'),
        }
      };
      
      setDebugInfo(debug);
      
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
      
      // Пытаемся получить данные пользователя из разных источников
      let userData = null;
      
      // Проверяем куки
      const userCookie = getCookie('twitch_user');
      if (userCookie) {
        try {
          userData = JSON.parse(userCookie);
          console.log('Данные пользователя получены из куки');
        } catch (e) {
          console.error('Ошибка при парсинге данных пользователя из куки:', e);
        }
      }
      
      // Если нет в куках, проверяем localStorage
      if (!userData && typeof window !== 'undefined') {
        const userLocalStorage = localStorage.getItem('twitch_user') || localStorage.getItem('cookie_twitch_user');
        if (userLocalStorage) {
          try {
            userData = JSON.parse(userLocalStorage);
            console.log('Данные пользователя получены из localStorage');
            
            // Восстанавливаем куку
            if (userData) {
              Cookies.set('twitch_user', JSON.stringify(userData), {
                path: '/',
                secure: window.location.protocol === 'https:',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7 // 7 дней
              });
              console.log('Восстановлена кука с данными пользователя из localStorage');
            }
          } catch (e) {
            console.error('Ошибка при парсинге данных пользователя из localStorage:', e);
          }
        }
      }
      
      // Проверяем флаг авторизации в localStorage
      const isAuthenticated = localStorage.getItem('is_authenticated') === 'true';
      console.log('Флаг авторизации в localStorage:', isAuthenticated ? 'авторизован' : 'не авторизован');
      
      if (accessToken && userData) {
        console.log('Обнаружен токен доступа и данные пользователя, перенаправление на /menu');
        
        // Сохраняем текущий домен перед редиректом
        if (typeof window !== 'undefined') {
          localStorage.setItem('current_domain', window.location.origin);
          
          // Также сохраняем токен в localStorage для надежности
          localStorage.setItem('cookie_twitch_access_token', accessToken);
          
          // Сохраняем данные пользователя в localStorage
          localStorage.setItem('twitch_user', JSON.stringify(userData));
          localStorage.setItem('cookie_twitch_user', JSON.stringify(userData));
          
          // Устанавливаем флаг авторизации
          localStorage.setItem('is_authenticated', 'true');
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
      } else if (accessToken && !userData) {
        // Есть токен, но нет данных пользователя - пробуем получить данные
        console.log('Обнаружен токен доступа, но нет данных пользователя. Пробуем получить данные профиля.');
        setIsLoading(true);
        
        // Добавляем дополнительное логирование для отладки
        console.log('Отправка запроса к API профиля с токеном:', accessToken.substring(0, 10) + '...');
        
        fetch('/api/twitch/profile', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        })
        .then(response => {
          console.log('Получен ответ от API профиля:', response.status);
          if (response.ok) {
            return response.json();
          }
          throw new Error(`Не удалось получить данные профиля: ${response.status}`);
        })
        .then(data => {
          console.log('Данные профиля получены:', data);
          
          // Создаем объект с данными пользователя
          const userDataObj = {
            id: data.id,
            login: data.login || data.twitchName.toLowerCase(),
            display_name: data.twitchName,
            profile_image_url: data.profileImageUrl
          };
          
          // Сохраняем данные пользователя в куки и localStorage
          Cookies.set('twitch_user', JSON.stringify(userDataObj), {
            path: '/',
            secure: window.location.protocol === 'https:',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 7 дней
          });
          
          localStorage.setItem('twitch_user', JSON.stringify(userDataObj));
          localStorage.setItem('cookie_twitch_user', JSON.stringify(userDataObj));
          
          // Устанавливаем флаг авторизации
          localStorage.setItem('is_authenticated', 'true');
          
          console.log('Данные пользователя сохранены, перенаправление на /menu');
          
          // Сохраняем текущий домен перед редиректом
          if (typeof window !== 'undefined') {
            localStorage.setItem('current_domain', window.location.origin);
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
        })
        .catch(error => {
          console.error('Ошибка при получении данных профиля:', error);
          // Очищаем токены, так как они, вероятно, недействительны
          Cookies.remove('twitch_access_token');
          Cookies.remove('twitch_refresh_token');
          localStorage.removeItem('cookie_twitch_access_token');
          localStorage.removeItem('cookie_twitch_refresh_token');
          localStorage.removeItem('is_authenticated');
          
          setErrorMessage('Данные пользователя не найдены. Пожалуйста, авторизуйтесь снова.');
          setIsLoading(false);
        });
      } else if (isAuthenticated) {
        // Есть флаг авторизации, но нет токена или данных пользователя
        console.log('Обнаружен флаг авторизации, но нет токена или данных пользователя. Очищаем флаг.');
        localStorage.removeItem('is_authenticated');
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
    
    // Очищаем все куки и localStorage перед авторизацией
    Cookies.remove('twitch_access_token');
    Cookies.remove('twitch_refresh_token');
    Cookies.remove('twitch_user');
    localStorage.removeItem('twitch_user');
    localStorage.removeItem('cookie_twitch_access_token');
    localStorage.removeItem('cookie_twitch_refresh_token');
    localStorage.removeItem('cookie_twitch_user');
    localStorage.removeItem('is_authenticated');
    
    // Сохраняем текущий домен перед редиректом
    if (typeof window !== 'undefined') {
      localStorage.setItem('current_domain', window.location.origin);
      
      // Добавляем обработчик для проверки авторизации после возврата
      const checkAuthAfterRedirect = () => {
        console.log('Проверка авторизации после возврата...');
        const accessToken = getCookieWithLocalStorage('twitch_access_token');
        const userData = getCookieWithLocalStorage('twitch_user');
        
        if (accessToken && userData) {
          console.log('Авторизация успешна, данные пользователя получены');
          localStorage.setItem('is_authenticated', 'true');
        } else {
          console.log('Авторизация не удалась или данные пользователя не получены');
          localStorage.removeItem('is_authenticated');
        }
      };
      
      // Сохраняем функцию проверки в sessionStorage
      sessionStorage.setItem('check_auth_after_redirect', 'true');
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
      
      {process.env.NODE_ENV === 'development' && debugInfo && (
        <div className={styles.debugInfo}>
          <h3>Отладочная информация</h3>
          <div>
            <h4>Cookies:</h4>
            <ul>
              {Object.entries(debugInfo.cookies).map(([key, value]) => (
                <li key={key}>{key}: {value ? 'Да' : 'Нет'}</li>
              ))}
            </ul>
            <h4>LocalStorage:</h4>
            <ul>
              {Object.entries(debugInfo.localStorage).map(([key, value]) => (
                <li key={key}>{key}: {value ? 'Да' : 'Нет'}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
} 