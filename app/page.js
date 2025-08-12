'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from './contexts/AuthContext';
import HoldLoginButton from './components/HoldLoginButton/HoldLoginButton';
import LoginButton from './components/LoginButton/LoginButton';
import Image from 'next/image';
import styles from './home.module.css'; // Используем стили для главной
import { useTranslation } from 'react-i18next';

export default function HomePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const rePushTriedRef = useRef(false);

  useEffect(() => {
    const errorDescription = searchParams.get('error_description');
    if (errorDescription) {
      setError(errorDescription);
    }
  }, [searchParams]);

  // Подстраховка: если после OAuth нас скинуло на главную,
  // а флаг свежего логина ещё есть — докинем редирект в /menu сами
  useEffect(() => {
    if (rePushTriedRef.current) return;
    const freshByQuery = searchParams.get('freshLogin') === 'true';
    const freshBySession = (() => { try { return sessionStorage.getItem('freshLogin') === '1'; } catch { return false; } })();
    if ((freshByQuery || freshBySession) && !isLoading) {
      rePushTriedRef.current = true;
      const target = '/menu?freshLogin=true';
      // Если уже аутентифицированы — сразу идём; если нет — даём крохотную паузу
      const delay = isAuthenticated ? 0 : 150;
      setTimeout(() => {
        router.replace(target);
      }, delay);
    }
  }, [searchParams, isLoading, isAuthenticated, router]);

  // Простой компонент для звездного фона
  const StarryBackground = () => (
      <div className={styles.stars}>
        {/* <div className={styles.twinkling}></div> */}
      </div>
  );

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className="spinner"></div>
        <p>{t('loading.universe')}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
        <StarryBackground />
        <div className={styles.content}>
            <Image 
                src="/logo.png" // <<< Убедись, что лого лежит в /public/logo.png
                alt="Streamers Universe Logo"
                width={200} // <<< Размер лого
                height={200}
                className={styles.logo}
                priority // Для LCP
            />
            
            {error && <p className={styles.errorMessage}>{t('error')}: {error}</p>}

            <div className={styles.loggedOutContent}>
                <h2>
                    {isAuthenticated 
                        ? "С возвращением во Вселенную!" 
                        : "Добро пожаловать во Вселенную Стримеров!"}
                </h2>
                <p>
                    {isAuthenticated
                        ? "Нажмите кнопку, чтобы войти в Меню"
                        : "Нажмите кнопку, чтобы войти через Twitch"}
                </p>
                {isAuthenticated ? <HoldLoginButton /> : <LoginButton />}
            </div>
        </div>
    </div>
  );
} 