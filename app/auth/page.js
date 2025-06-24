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
    // Этот эффект будет реагировать на изменение статуса аутентификации.
    // Если загрузка завершилась и пользователь аутентифицирован,
    // middleware уже должен был перенаправить его.
    // Но если пользователь как-то попал сюда, будучи авторизованным, перенаправим его в меню.
    if (!isLoading && isAuthenticated) {
      console.log('[AuthPage] Пользователь уже аутентифицирован, перенаправление в /menu.');
      router.replace('/menu'); // Используем replace, чтобы не добавлять /auth в историю браузера
    }
  }, [isLoading, isAuthenticated, router]);

  // Пока идет проверка статуса, или если пользователь уже аутентифицирован
  // и ждет редиректа, показываем лоадер.
  if (isLoading || isAuthenticated) {
    return (
      <div className={pageStyles.loadingContainer}>
        <div className="spinner"></div>
        <p>Проверка статуса...</p>
      </div>
    );
  }

  // <<< Используем ту же структуру, что и HomePage >>>
  const StarryBackground = () => (
      <div className={pageStyles.stars}>
        {/* <div className={pageStyles.twinkling}></div> */}
      </div>
  );

  // Если загрузка завершена и пользователь НЕ аутентифицирован,
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