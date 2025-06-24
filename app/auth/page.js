'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
// import HoldLoginButton from '../components/HoldLoginButton/HoldLoginButton'; // Старый импорт
import LoginButton from '../components/LoginButton/LoginButton'; // Новый импорт
// import styles from './auth.module.css'; // <<< Убираем неиспользуемый импорт
import Image from 'next/image'; // <<< Добавляем импорт Image
import pageStyles from '../home.module.css'; // <<< Используем стили из home
import { useAuth } from '../contexts/AuthContext'; // <<< Импортируем useAuth

export default function AuthPage() {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Если проверка статуса завершена и пользователь аутентифицирован,
    // отправляем его в меню.
    if (!isLoading && isAuthenticated) {
      console.log('[AuthPage] Пользователь аутентифицирован, перенаправление в /menu.');
      router.replace('/menu');
    }
  }, [isLoading, isAuthenticated, router]);

  const StarryBackground = () => (
    <div className={pageStyles.stars}></div>
  );

  // 1. Пока идет первоначальная проверка, показываем один лоадер.
  if (isLoading) {
    return (
      <div className={pageStyles.loadingContainer}>
        <div className="spinner"></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  // 2. Если проверка завершена и пользователь АВТОРИЗОВАН,
  // значит, useEffect уже запустил редирект. Показываем другой лоадер.
  if (isAuthenticated) {
     return (
      <div className={pageStyles.loadingContainer}>
        <div className="spinner"></div>
        <p>Перенаправление в меню...</p>
      </div>
    );
  }

  // 3. Если проверка завершена и пользователь НЕ авторизован,
  // показываем страницу входа.
  return (
    <div className={pageStyles.container}> {/* Используем стили из home.module.css */} 
      <StarryBackground />
      <div className={pageStyles.content}>
        <Image 
            src="/logo.png" 
            alt="Streamers Universe Logo"
            width={200} 
            height={200}
            className={pageStyles.logo}
            priority 
        />
        <div className={pageStyles.loggedOutContent}> 
            <h2>Добро пожаловать во Вселенную Стримеров!</h2>
            <p>Авторизуйтесь, чтобы продолжить</p>
             {/* Кнопка сама разберется, что делать */}
            {/* <HoldLoginButton /> */}
            <LoginButton />
        </div>
      </div>
    </div>
  );
} 