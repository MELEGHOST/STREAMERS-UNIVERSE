'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import HoldLoginButton from '../components/HoldLoginButton/HoldLoginButton';
// import styles from './auth.module.css'; // <<< Убираем неиспользуемый импорт
import Image from 'next/image'; // <<< Добавляем импорт Image
import pageStyles from '../home.module.css'; // <<< Используем стили из home
import { useAuth } from '../contexts/AuthContext'; // <<< Импортируем useAuth

export default function AuthPage() {
  const { isLoading, isAuthenticated, session } = useAuth();
  const router = useRouter();

  console.log('[AuthPage] Rendering...', { isLoading, isAuthenticated, session_exists: !!session });

  useEffect(() => {
    console.log('[AuthPage] useEffect check:', { isLoading, isAuthenticated, session_exists: !!session });
    if (!isLoading && isAuthenticated) {
      console.log('[AuthPage] User is authenticated, redirecting to /menu...');
      router.push('/menu');
    } else if (!isLoading && !isAuthenticated) {
      console.log('[AuthPage] User is not authenticated, staying on auth page.');
    }
  }, [isLoading, isAuthenticated, router, session]);

  // <<< Используем ту же структуру, что и HomePage >>>
  const StarryBackground = () => (
      <div className={pageStyles.stars}>
        {/* <div className={pageStyles.twinkling}></div> */}
      </div>
  );

  // Если isLoading=true ИЛИ (уже не isLoading, но isAuthenticated=true и мы ждем редиректа из useEffect)
  // показываем лоадер. Это предотвратит мигание контента страницы входа для уже вошедшего юзера.
  if (isLoading || (!isLoading && isAuthenticated)) {
    return (
        <div className={pageStyles.loadingContainer}> 
             <div className="spinner"></div>
             <p>Загрузка Вселенной...</p>
        </div>
    );
  }

  // <<< Если не isLoading И НЕ isAuthenticated, рендерим контент для входа >>>
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
            <HoldLoginButton />
        </div>
      </div>
    </div>
  );
} 