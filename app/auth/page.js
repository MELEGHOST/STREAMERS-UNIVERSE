'use client';

// Удаляем конфигурационные экспорты, так как это клиентский компонент
// export const dynamic = 'force-dynamic';
// export const fetchCache = 'force-no-store';
// export const revalidate = 0;
// export const dynamicParams = true;

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
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

// Компонент-заглушка для Suspense
function AuthLoadingFallback() {
  return (
    <div className={styles.container}>
      <div className={styles.authBox}>
        <h1>Загрузка...</h1>
        <div className={styles.loader}>
          <div className={styles.spinner}></div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPageWrapper() {
  // Оборачиваем основной компонент в Suspense
  return (
    <Suspense fallback={<AuthLoadingFallback />}>
      <AuthPage />
    </Suspense>
  );
}

// Переименовываем основной компонент, чтобы использовать обертку
function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
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

  // Обработка отображения ошибок из URL
  useEffect(() => {
    // Если есть ошибка в URL, устанавливаем её
    if (errorType && errorType !== 'auth_code_exchange_failed') {
      // Отображаем старые ошибки, если они переданы
      setError(`Ошибка авторизации: ${errorType}`); 
    } else if (errorType === 'auth_code_exchange_failed') {
        setError('Не удалось обменять код авторизации на сессию. Попробуйте снова.');
    }
    
    // Проверяем, не пришли ли мы сюда после успешной аутентификации Supabase
    // Обычно Supabase редиректит на /menu (или что указано в redirectTo),
    // поэтому эта страница /auth не должна отображаться для авторизованного пользователя.
    // Но можно добавить проверку на сессию Supabase для надежности.
    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            // Если сессия есть, а мы на /auth, перенаправляем
            console.log('AuthPage: Обнаружена активная сессия Supabase, редирект на /menu');
            router.push('/menu');
        }
    };
    checkSession();

  }, [errorType, searchParams, router, supabase]);

  // Функция для входа через Twitch с использованием Supabase
  const handleTwitchLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Инициируем вход через Twitch с помощью Supabase
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'twitch',
        options: {
          // Указываем URL, куда Supabase должен вернуть пользователя ПОСЛЕ
          // своей внутренней обработки callback'а Twitch.
          // Этот URL должен вести на наш новый обработчик /auth/callback
          redirectTo: `${window.location.origin}/auth/callback`,
          // Можно передать дополнительные параметры, если нужно
          // queryParams: { access_type: 'offline', prompt: 'consent' }
        }
      });

      if (signInError) {
        console.error('Ошибка при инициации входа через Supabase OAuth:', signInError);
        setError(signInError.message || 'Не удалось начать процесс входа через Twitch.');
        setLoading(false);
      }
      // Если ошибки нет, Supabase автоматически перенаправит пользователя на страницу авторизации Twitch.
      // После подтверждения Twitch перенаправит на callback URL Supabase,
      // а Supabase перенаправит на наш redirectTo (/auth/callback).

    } catch (catchError) {
      console.error('Критическая ошибка при входе через Twitch:', catchError);
      setError('Произошла непредвиденная ошибка. Пожалуйста, попробуйте снова.');
      setLoading(false);
    }
  };

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
          disabled={loading}
        >
          {loading ? (
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