'use client';

import React from 'react';
import { useAuth } from './contexts/AuthContext';
import HoldLoginButton from './components/HoldLoginButton/HoldLoginButton';
import LoginButton from './components/LoginButton/LoginButton';
import Image from 'next/image';
import styles from './home.module.css'; // Используем стили для главной
import { useTranslation } from 'react-i18next';

export default function HomePage() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuth();

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