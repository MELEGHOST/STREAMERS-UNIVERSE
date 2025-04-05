'use client';

import React, { useEffect, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './auth.module.css'; // Используем стили из текущей папки

// Компонент, использующий useSearchParams
function AuthContent() {
  const { supabase } = useAuth();
  const searchParams = useSearchParams();

  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const message = searchParams.get('message');

  const handleLogin = async () => {
    if (!supabase) {
      console.error('[AuthPage] Supabase client не инициализирован!');
      alert('Ошибка конфигурации: Supabase недоступен.');
      return;
    }
    
    const redirectTo = `${window.location.origin}/auth/callback`;
    // Сохраняем путь, куда перейти после успешного входа
    const nextAfterLogin = searchParams.get('next') ? `?next=${encodeURIComponent(searchParams.get('next'))}` : '';
    const finalRedirectTo = `${redirectTo}${nextAfterLogin}`;

    console.log('[AuthPage] Инициируем вход через Twitch OAuth...');
    console.log('[AuthPage] Redirect URL будет:', finalRedirectTo);
    
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'twitch',
      options: {
        redirectTo: finalRedirectTo,
        // scopes: 'user:read:email', // Можно добавить позже
      },
    });

    if (signInError) {
      console.error('[AuthPage] Ошибка при инициации входа через Twitch:', signInError.message);
      alert(`Ошибка входа: ${signInError.message}`);
    }
  };

  return (
    <>
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
    </>
  );
}

// Основной компонент страницы
export default function AuthPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Перенаправляем, если пользователь уже авторизован
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      console.log('[AuthPage] Пользователь уже авторизован, перенаправление на /menu');
      router.push('/menu');
    }
  }, [isLoading, isAuthenticated, router]);

  // Показываем индикатор загрузки, пока проверяется сессия
  if (isLoading) {
    return (
        <div className={styles.authContainer}>
            <div className="spinner"></div>
            <p>Проверка статуса...</p>
        </div>
    );
  }

  // Если не авторизован, показываем контент внутри Suspense
  return (
    <div className={styles.authContainer}>
      <Suspense fallback={<div className="spinner"></div>}>
        <AuthContent />
      </Suspense>
    </div>
  );
} 