'use client';

import React from 'react';
// import { useRouter } from 'next/navigation'; // <<< Убираем неиспользуемый импорт
import { useAuth } from './contexts/AuthContext';
import HoldLoginButton from './components/HoldLoginButton/HoldLoginButton';
import Image from 'next/image';
import styles from './home.module.css'; // Используем стили для главной

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  // const router = useRouter(); // <<< Убираем неиспользуемую переменную

  // Простой компонент для звездного фона
  const StarryBackground = () => (
      <div className={styles.stars}>
        {/* <div className={styles.twinkling}></div> */}
      </div>
  );

  if (isLoading) {
    return (
        <div className={styles.loadingContainer}> 
             <div className="spinner"></div>
             <p>Загрузка Вселенной...</p>
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
                        ? "Зажмите кнопку, чтобы войти в Меню"
                        : "Зажмите кнопку, чтобы войти через Twitch"}
                </p>
                <HoldLoginButton />
            </div>
        </div>
    </div>
  );
} 