'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Cookies from 'js-cookie';
import { DataStorage } from '../utils/dataStorage';
import styles from './auth.module.css';

// Компонент для отображения диагностической информации Twitch
function TwitchErrorInfo({ errorType, errorDetails }) {
  if (!errorType) return null;
  
  return (
    <div className={styles.errorInfo}>
      <h2>Информация об ошибке авторизации</h2>
      
      {errorType === 'redirect_mismatch' && (
        <div>
          <p>Обнаружено несоответствие URI редиректа:</p>
          <div className={styles.codeBlock}>
            <p><strong>Настроенный:</strong> {errorDetails.configured}</p>
            <p><strong>Фактический:</strong> {errorDetails.actual}</p>
          </div>
          <p>Для исправления ошибки выполните следующие действия:</p>
          <ol>
            <li>Перейдите в <a href="https://dev.twitch.tv/console/apps" target="_blank" rel="noreferrer">консоль разработчика Twitch</a></li>
            <li>Откройте настройки вашего приложения</li>
            <li>В поле &quot;OAuth Redirect URLs&quot; убедитесь, что указан следующий URL:</li>
            <div className={styles.codeBlock}>
              <code>{errorDetails.actual}</code>
            </div>
            <li>Сохраните изменения и попробуйте войти снова</li>
          </ol>
        </div>
      )}
      
      {errorType === 'token_error' && (
        <div>
          <p>Ошибка при получении токена:</p>
          <div className={styles.codeBlock}>
            <p><strong>Статус:</strong> {errorDetails.status}</p>
            {errorDetails.message && <p><strong>Сообщение:</strong> {errorDetails.message}</p>}
          </div>
        </div>
      )}
      
      {errorType === 'config_error' && (
        <div>
          <p>Ошибка конфигурации Twitch API:</p>
          <p>Отсутствуют необходимые переменные окружения. Проверьте настройки приложения.</p>
        </div>
      )}
      
      {errorType === 'user_error' && (
        <div>
          <p>Ошибка при получении данных пользователя из Twitch API.</p>
        </div>
      )}
      
      {(errorType !== 'redirect_mismatch' && 
        errorType !== 'token_error' && 
        errorType !== 'config_error' && 
        errorType !== 'user_error') && (
        <div>
          <p>Тип ошибки: {errorType}</p>
          {errorDetails.message && <p>Сообщение: {errorDetails.message}</p>}
        </div>
      )}
    </div>
  );
}

export default function AuthPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Получаем параметры из URL для отображения информации об ошибке
  const errorType = searchParams.get('error');
  const errorMessage = searchParams.get('message');
  const configuredRedirect = searchParams.get('configured');
  const actualRedirect = searchParams.get('actual');
  const errorStatus = searchParams.get('status');
  
  // Формируем детали ошибки для отображения
  const errorDetails = {
    configured: configuredRedirect,
    actual: actualRedirect,
    message: errorMessage,
    status: errorStatus
  };

  // Функция для обработки успешной авторизации
  const handleSuccessfulAuth = useCallback(async () => {
    try {
      setLoading(true);
      
      // Сохраняем токены в хранилище
      if (session?.accessToken) {
        Cookies.set('twitch_access_token', session.accessToken, { expires: 7 });
        localStorage.setItem('cookie_twitch_access_token', session.accessToken);
        await DataStorage.saveData('auth_token', session.accessToken);
      }
      
      if (session?.refreshToken) {
        Cookies.set('twitch_refresh_token', session.refreshToken, { expires: 30 });
        localStorage.setItem('twitch_refresh_token', session.refreshToken);
        await DataStorage.saveData('refresh_token', session.refreshToken);
      }
      
      if (session?.expiresAt) {
        const expiresAt = session.expiresAt * 1000; // Преобразуем в миллисекунды
        localStorage.setItem('twitch_token_expires_at', expiresAt.toString());
      }
      
      // Сохраняем данные пользователя
      if (session?.user) {
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
  }, [router, session, setLoading, setError]);

  // Обработка перенаправления после успешной авторизации
  useEffect(() => {
    if (status === 'authenticated' && session) {
      handleSuccessfulAuth();
    }
    
    // Если есть ошибка в URL, устанавливаем её
    if (errorType) {
      setError(`Ошибка авторизации: ${errorType}`);
    }
  }, [session, status, errorType, handleSuccessfulAuth]);

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
      
      // Прямое перенаправление на API endpoint вместо fetch запроса
      // Это позволяет избежать проблем с CORS
      window.location.href = '/api/twitch/login';
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
        
        {/* Отображаем информацию об ошибке, если она есть */}
        {errorType && <TwitchErrorInfo errorType={errorType} errorDetails={errorDetails} />}
        
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