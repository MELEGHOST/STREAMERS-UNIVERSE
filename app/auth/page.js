'use client';

import React from 'react';
// import { useRouter } from 'next/navigation';
import LoginButton from '../components/LoginButton/LoginButton';
import Image from 'next/image';
import pageStyles from '../home.module.css';
import { useAuth } from '../contexts/AuthContext';

export default function AuthPage() {
  const { isLoading, isAuthenticated } = useAuth();
  
  // Клиентский редирект больше не нужен, им полностью управляет middleware.

  const StarryBackground = () => (
    <div className={pageStyles.stars}></div>
  );

  // Если isLoading=true, мы не знаем статус -> показываем лоадер.
  // Если isAuthenticated=true, middleware должен перенаправить пользователя.
  // Клиент просто показывает лоадер, ожидая этого редиректа.
  if (isLoading || isAuthenticated) {
    return (
      <div className={pageStyles.loadingContainer}>
        <div className="spinner"></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  // Если загрузка завершена и пользователь НЕ авторизован,
  // показываем страницу входа.
  return (
    <div className={pageStyles.container}>
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
            <LoginButton />
        </div>
      </div>
    </div>
  );
} 