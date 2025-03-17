'use client';

import React, { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { DataStorage } from '../utils/dataStorage';
import styles from './auth.module.css';

export default function AuthPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Обработка перенаправления после успешной авторизации
  useEffect(() => {
    if (status === 'authenticated' && session) {
      handleSuccessfulAuth();
    }
  }, [session, status]);

  // Функция для обработки успешной авторизации
  const handleSuccessfulAuth = async () => {
    try {
      setLoading(true);
      
      // Сохраняем токены в хранилище
      if (session.accessToken) {
        Cookies.set('twitch_access_token', session.accessToken, { expires: 7 });
        localStorage.setItem('cookie_twitch_access_token', session.accessToken);
        await DataStorage.saveData('auth_token', session.accessToken);
      }
      
      if (session.refreshToken) {
        Cookies.set('twitch_refresh_token', session.refreshToken, { expires: 30 });
        localStorage.setItem('twitch_refresh_token', session.refreshToken);
        await DataStorage.saveData('refresh_token', session.refreshToken);
      }
      
      if (session.expiresAt) {
        const expiresAt = session.expiresAt * 1000; // Преобразуем в миллисекунды
        localStorage.setItem('twitch_token_expires_at', expiresAt.toString());
      }
      
      // Сохраняем данные пользователя
      if (session.user) {
        localStorage.setItem('twitch_user', JSON.stringify(session.user));
        await DataStorage.saveData('user', session.user);
      }
      
      // Проверяем, есть ли сохраненный URL для перенаправления
      const redirectUrl = localStorage.getItem('auth_redirect');
      if (redirectUrl) {
        localStorage.removeItem('auth_redirect');
        router.push(redirectUrl);
      } else {
        router.push('/profile');
      }
    } catch (error) {
      console.error('Ошибка при обработке авторизации:', error);
      setError('Произошла ошибка при обработке авторизации. Пожалуйста, попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  // Функция для входа через Twitch
  const handleTwitchLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Сохраняем текущий URL для возврата после авторизации
      const currentPath = window.location.pathname;
      if (currentPath !== '/auth') {
        localStorage.setItem('auth_redirect', currentPath);
      }
      
      await signIn('twitch', { callbackUrl: '/auth' });
    } catch (error) {
      console.error('Ошибка при входе через Twitch:', error);
      setError('Произошла ошибка при входе через Twitch. Пожалуйста, попробуйте снова.');
      setLoading(false);
    }
  };

  // Если пользователь уже авторизован, показываем сообщение о перенаправлении
  if (status === 'authenticated') {
    return (
      <div className={styles.container}>
        <div className={styles.authBox}>
          <h1>Вы уже авторизованы</h1>
          <p>Перенаправляем вас...</p>
          {loading && (
            <div className={styles.loader}>
              <div className={styles.spinner}></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.authBox}>
        <h1>Авторизация</h1>
        <p>Войдите с помощью вашего аккаунта Twitch для доступа к функциям платформы</p>
        
        {error && <div className={styles.error}>{error}</div>}
        
        <button 
          className={styles.twitchButton}
          onClick={handleTwitchLogin}
          disabled={loading || status === 'loading'}
        >
          {loading || status === 'loading' ? (
            <div className={styles.buttonLoader}>
              <div className={styles.spinner}></div>
              <span>Загрузка...</span>
            </div>
          ) : (
            <>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="#fff">
                <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
              </svg>
              <span>Войти через Twitch</span>
            </>
          )}
        </button>
        
        <div className={styles.info}>
          <p>Авторизуясь, вы соглашаетесь с нашими условиями использования и политикой конфиденциальности.</p>
        </div>
      </div>
    </div>
  );
} 