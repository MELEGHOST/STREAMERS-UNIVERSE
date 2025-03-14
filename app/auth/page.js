'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { useAuth } from '../../contexts/AuthContext';
import styles from './auth.module.css';
import clientStorage from '../utils/clientStorage';

export default function Auth() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const hasCheckedAuthRef = useRef(false);

  useEffect(() => {
    // Очищаем потенциальные флаги конфликтов
    clientStorage.removeItem('redirect_in_progress');
    
    // Простая проверка авторизации при загрузке страницы
    if (!hasCheckedAuthRef.current) {
      hasCheckedAuthRef.current = true;
      
      // Проверяем, есть ли токен и данные пользователя
      const accessToken = clientStorage.getItem('cookie_twitch_access_token') || Cookies.get('twitch_access_token');
      const userData = clientStorage.getItem('cookie_twitch_user') || clientStorage.getItem('twitch_user') || Cookies.get('twitch_user');

      if (accessToken && userData) {
        // Если данные есть, перенаправляем на меню
        console.log('Пользователь уже авторизован, перенаправляем в меню');
        try {
          // Обновляем состояние аутентификации
          const parsedUserData = typeof userData === 'string' ? JSON.parse(userData) : userData;
          login(parsedUserData, accessToken);
          
          // Устанавливаем флаг перенаправления
          clientStorage.setItem('auth_to_menu_redirect', 'true');
          
          // Перенаправляем на страницу меню
          router.push('/menu');
        } catch (error) {
          console.error('Ошибка при обработке данных пользователя:', error);
          setErrorMessage('Произошла ошибка при обработке данных пользователя. Пожалуйста, попробуйте войти снова.');
        }
      } else {
        // Проверяем, не пришли ли мы сюда после редиректа с меню
        if (clientStorage.getItem('menu_to_auth_redirect')) {
          // Очищаем флаг для предотвращения зацикливания
          clientStorage.removeItem('menu_to_auth_redirect');
          // Очищаем все данные аутентификации, чтобы быть уверенными
          clientStorage.removeItem('twitch_user');
          clientStorage.removeItem('cookie_twitch_user');
          clientStorage.removeItem('cookie_twitch_access_token');
          Cookies.remove('twitch_access_token');
          Cookies.remove('twitch_user');
        }
      }
    }
  }, [login, router]);

  // Обработчик авторизации через Twitch
  const handleAuth = () => {
    try {
      setIsLoading(true);
      
      // Очищаем все куки и localStorage перед авторизацией
      Cookies.remove('twitch_access_token', { path: '/' });
      Cookies.remove('twitch_refresh_token', { path: '/' });
      Cookies.remove('twitch_user', { path: '/' });
      Cookies.remove('twitch_token', { path: '/' });
      clientStorage.removeItem('twitch_user');
      clientStorage.removeItem('cookie_twitch_access_token');
      clientStorage.removeItem('cookie_twitch_refresh_token');
      clientStorage.removeItem('cookie_twitch_user');
      clientStorage.removeItem('is_authenticated');
      clientStorage.removeItem('auth_to_menu_redirect');
      clientStorage.removeItem('menu_to_auth_redirect');
      
      // Перенаправляем на API авторизации
      console.log('Перенаправляем на страницу авторизации Twitch');
      window.location.href = '/api/twitch/login';
    } catch (error) {
      console.error('Ошибка при авторизации:', error);
      setErrorMessage('Произошла ошибка при перенаправлении на страницу авторизации. Пожалуйста, попробуйте еще раз.');
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.stars}></div>
      
      <div className={styles.authContent}>
        <div className={styles.logo}></div>
        
        <h1 className={styles.welcomeTitle}>Добро пожаловать в Streamers Universe</h1>
        
        <p className={styles.description}>
          Здесь вы сможете погрузиться в мир стриминга, найти своих любимых стримеров и стать частью сообщества.
          Присоединяйтесь к нам и откройте для себя новые возможности!
        </p>
        
        <div className={styles.authButtonWrapper} onClick={handleAuth} disabled={isLoading}>
          <button className={styles.authButton}>
            <div className={styles.authButtonGlitchMask}>
              <span className={styles.authButtonText}>{isLoading ? 'Загрузка...' : 'Войти через Twitch'}</span>
              <span className={styles.authButtonTextGlitch}>{isLoading ? 'Загрузка...' : 'Войти через Twitch'}</span>
            </div>
            <div className={styles.authButtonScanlines}></div>
            <div className={styles.authButtonGlow}></div>
            <div className={styles.authButtonGrid}></div>
            <div className={styles.authButtonBorders}></div>
            <div className={styles.authStars}>
              <div className={styles.star}></div>
              <div className={styles.star}></div>
              <div className={styles.star}></div>
              <div className={styles.star}></div>
              <div className={styles.star}></div>
            </div>
            <div className={styles.authFlare}></div>
            <div className={styles.authNoise}></div>
            <div className={styles.authCircles}></div>
          </button>
        </div>
        
        <div className={styles.authInfo}>
          <details className={styles.authDetails}>
            <summary>Зачем нужна авторизация через Twitch?</summary>
            <div className={styles.authDetailsContent}>
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
      
      {errorMessage && (
        <div className={styles.errorMessage}>
          {errorMessage}
        </div>
      )}
    </div>
  );
} 