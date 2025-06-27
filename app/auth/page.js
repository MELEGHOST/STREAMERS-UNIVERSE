'use client';

import React from 'react';
// import { useRouter } from 'next/navigation';
import LoginButton from '../components/LoginButton/LoginButton';
import Image from 'next/image';
import pageStyles from '../home.module.css';
// import { useAuth } from '../contexts/AuthContext'; // Больше не нужно

export default function AuthPage() {
  // Логика состояний загрузки и аутентификации здесь больше не нужна.
  // Этим полностью управляет middleware и AuthProvider на уровне layout.
  // AuthPage теперь - это просто "глупая" страница, которая отображает контент для неавторизованных пользователей.

  const StarryBackground = () => (
    <div className={pageStyles.stars}></div>
  );

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