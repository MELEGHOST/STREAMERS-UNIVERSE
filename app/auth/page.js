'use client';

// Удаляем конфигурационные экспорты, так как это клиентский компонент
// export const dynamic = 'force-dynamic';
// export const fetchCache = 'force-no-store';
// export const revalidate = 0;
// export const dynamicParams = true;

import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext'; // Импортируем useAuth
import { useRouter, useSearchParams } from 'next/navigation';
import styles from '../../styles/auth.module.css'; // Подключаем стили

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
  const { supabase, isAuthenticated, isLoading } = useAuth(); // Получаем supabase и статус из контекста
  const router = useRouter();
  const searchParams = useSearchParams();

  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const message = searchParams.get('message');

  // Перенаправляем, если пользователь уже авторизован
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      console.log('[AuthPage] Пользователь уже авторизован, перенаправление на /menu');
      const nextUrl = searchParams.get('next') || '/menu';
      router.push(nextUrl);
    }
  }, [isLoading, isAuthenticated, router, searchParams]);

  const handleLogin = async () => {
    if (!supabase) {
      console.error('[AuthPage] Supabase client не инициализирован!');
      // Можно показать сообщение об ошибке пользователю
      return;
    }
    
    // Получаем URL для перенаправления после входа из параметра 'next' или по умолчанию
    const redirectTo = `${window.location.origin}/auth/callback`;
    const nextAfterLogin = searchParams.get('next') ? `?next=${encodeURIComponent(searchParams.get('next'))}` : '';
    const finalRedirectTo = `${redirectTo}${nextAfterLogin}`;

    console.log('[AuthPage] Инициируем вход через Twitch OAuth...');
    console.log('[AuthPage] Redirect URL будет:', finalRedirectTo);
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'twitch',
      options: {
        redirectTo: finalRedirectTo,
        // Можно добавить scopes, если нужны доп. разрешения
        // scopes: 'user:read:email',
      },
    });

    if (error) {
      console.error('[AuthPage] Ошибка при инициации входа через Twitch:', error.message);
      // Показываем ошибку пользователю
      alert(`Ошибка входа: ${error.message}`);
    }
  };

  // Показываем индикатор загрузки, пока проверяется сессия
  if (isLoading) {
    return (
        <div className={styles.authContainer}>
            <div className={styles.spinner}></div>
            <p>Проверка статуса...</p>
        </div>
    );
  }

  return (
    <div className={styles.authContainer}>
      <h1>Вход в Streamers Universe</h1>
      
      {/* Отображение ошибок или сообщений */} 
      {error && (
        <div className={styles.errorMessage}>
          <p><strong>Ошибка входа:</strong> {error}</p>
          {errorDescription && <p><small>{errorDescription}</small></p>}
        </div>
      )}
      {message && (
        <div className={styles.infoMessage}>
          <p>{message}</p>
        </div>
      )}

      <p>Для доступа к функциям платформы войдите через Twitch.</p>
      <button onClick={handleLogin} className={styles.twitchButton}>
        Войти через Twitch
      </button>
    </div>
  );
} 