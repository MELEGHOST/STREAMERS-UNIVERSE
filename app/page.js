'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './contexts/AuthContext';
import HoldLoginButton from './components/HoldLoginButton/HoldLoginButton';
import Image from 'next/image';
import styles from './home.module.css'; // Используем стили для главной

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Простой компонент для звездного фона
  const StarryBackground = () => (
      <div className={styles.stars}>
        <div className={styles.twinkling}></div>
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
            
            {isAuthenticated ? (
                <div className={styles.loggedInContent}>
                    <h2>С возвращением!</h2>
                    <p>Готов исследовать Вселенную Стримеров?</p>
                    <button 
                        className={styles.menuButton} 
                        onClick={() => router.push('/menu')}
                    >
                        Перейти в Меню
                    </button>
                </div>
            ) : (
                <div className={styles.loggedOutContent}>
                    <h2>Добро пожаловать во Вселенную Стримеров!</h2>
                    <p>Войдите, чтобы начать.</p>
                    <HoldLoginButton />
                 </div>
            )}
        </div>
    </div>
  );
} 