'use client';

import React from 'react';
import HoldLoginButton from '../components/HoldLoginButton/HoldLoginButton';
// import styles from './auth.module.css'; // <<< Убираем неиспользуемый импорт
import Image from 'next/image'; // <<< Добавляем импорт Image
import pageStyles from '../home.module.css'; // <<< Используем стили из home

export default function AuthPage() {
  // <<< Используем ту же структуру, что и HomePage >>>
  const StarryBackground = () => (
      <div className={pageStyles.stars}>
        {/* <div className={pageStyles.twinkling}></div> */}
      </div>
  );

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