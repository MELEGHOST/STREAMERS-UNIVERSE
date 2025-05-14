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
  const { isLoading, isAuthenticated, user } = useAuth(); // Добавил user для более явного лога
  const router = useRouter();

  console.log('[AuthPage] Rendering...', { isLoading, isAuthenticated, userId: user?.id, provider: user?.app_metadata?.provider });

  useEffect(() => {
    console.log('[AuthPage] useEffect check:', { isLoading, isAuthenticated, userId: user?.id });
    if (!isLoading && isAuthenticated) {
      console.log('[AuthPage] User is authenticated, attempting redirect to /menu...');
      router.push('/menu');
    } else if (!isLoading && !isAuthenticated) {
      console.log('[AuthPage] User is not authenticated, staying on auth page. Ready for login attempt.');
    }
    // Добавил user в зависимости, чтобы реагировать на его изменение, если isAuthenticated обновится с задержкой
  }, [isLoading, isAuthenticated, router, user]);

  // <<< Используем ту же структуру, что и HomePage >>>
  const StarryBackground = () => (
      <div className={pageStyles.stars}>
        {/* <div className={pageStyles.twinkling}></div> */}
      </div>
  );

  // Если isLoading, показываем лоадер.
  // Если НЕ isLoading и УЖЕ isAuthenticated, то useEffect выше должен был начать редирект.
  // В этом случае можно тоже показать лоадер, чтобы избежать мигания контента перед редиректом.
  if (isLoading) {
    return (
        <div className={pageStyles.loadingContainer}> 
             <div className="spinner"></div>
             <p>Загрузка Вселенной...</p>
        </div>
    );
  }

  // Если НЕ isLoading и НЕ isAuthenticated, значит, пользователь должен войти.
  // Показываем контент для входа.
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