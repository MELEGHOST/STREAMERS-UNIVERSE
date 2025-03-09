'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { useAuth } from '../../contexts/AuthContext';
import styles from './auth.module.css';

export default function Auth() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const hasCheckedAuthRef = useRef(false);
  const redirectTimeoutRef = useRef(null);

  useEffect(() => {
    // Простая проверка авторизации при загрузке страницы
    if (!hasCheckedAuthRef.current) {
      hasCheckedAuthRef.current = true;
      
      // Очищаем таймаут при размонтировании
      redirectTimeoutRef.current = setTimeout(() => {
        console.log('Таймаут проверки аутентификации на странице auth');
        // Если нет ответа в течение 3 секунд, считаем что пользователь не авторизован
        setIsLoading(false);
      }, 3000);

      // Функция для безопасного получения данных из localStorage
      const safeGetFromStorage = (key) => {
        if (typeof window !== 'undefined' && window.localStorage) {
          return localStorage.getItem(key);
        }
        return null;
      };

      // Проверяем, есть ли токен и данные пользователя
      const accessToken = safeGetFromStorage('cookie_twitch_access_token') || Cookies.get('twitch_access_token');
      const userData = safeGetFromStorage('cookie_twitch_user') || safeGetFromStorage('twitch_user') || Cookies.get('twitch_user');

      if (accessToken && userData) {
        // Если данные есть, перенаправляем на меню
        console.log('Пользователь уже авторизован, перенаправляем в меню');
        try {
          // Обновляем состояние аутентификации
          const parsedUserData = typeof userData === 'string' ? JSON.parse(userData) : userData;
          login(parsedUserData, accessToken);
        } catch (error) {
          console.error('Ошибка при обработке данных пользователя:', error);
        }
        
        // Перенаправляем на страницу меню
        router.push('/menu');
      } else {
        // Пользователь не авторизован
        console.log('Пользователь не авторизован, показываем форму авторизации');
        setIsLoading(false);
      }
    }
    
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, [login, router]);

  // Обработчик авторизации через Twitch
  const handleAuth = () => {
    try {
      setIsLoading(true);
      
      // Функция для безопасного удаления данных из localStorage
      const safeRemoveFromStorage = (key) => {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.removeItem(key);
        }
      };
      
      // Очищаем все куки и localStorage перед авторизацией
      Cookies.remove('twitch_access_token');
      Cookies.remove('twitch_refresh_token');
      Cookies.remove('twitch_user');
      Cookies.remove('twitch_token');
      safeRemoveFromStorage('twitch_user');
      safeRemoveFromStorage('cookie_twitch_access_token');
      safeRemoveFromStorage('cookie_twitch_refresh_token');
      safeRemoveFromStorage('cookie_twitch_user');
      safeRemoveFromStorage('is_authenticated');
      
      // Перенаправляем на API авторизации
      console.log('Перенаправляем на страницу авторизации Twitch');
      window.location.href = '/api/twitch/login';
    } catch (error) {
      console.error('Ошибка при авторизации:', error);
      setErrorMessage('Произошла ошибка при перенаправлении на страницу авторизации. Пожалуйста, попробуйте еще раз.');
      setIsLoading(false);
    }
  };

  // Показываем индикатор загрузки при инициализации
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.authContent}>
        <h1 className={styles.title}>Авторизация через Twitch</h1>
        
        {errorMessage && (
          <div className={styles.errorMessage}>
            {errorMessage}
          </div>
        )}
        
        <button 
          className={styles.authButton}
          onClick={handleAuth}
          disabled={isLoading}
        >
          {isLoading ? 'Загрузка...' : 'Войти через Twitch'}
        </button>
        
        <p className={styles.authInfo}>
          Для использования нашего сервиса необходимо авторизоваться через Twitch.
          Мы запрашиваем только базовую информацию из вашего аккаунта.
        </p>
      </div>
    </div>
  );
} 