'use client';

import dynamic from 'next/dynamic';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../src/context/AuthContext';
import Stars from '../src/components/Stars';

// Динамически импортируем компонент Home для клиентского рендеринга
const HomeComponent = () => {
  const router = useRouter();
  const { isAuthenticated } = useAuth() || {}; // Добавляем || {} для безопасности
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null; // Предотвращаем рендеринг до загрузки клиента

  if (isAuthenticated === true) { // Проверяем строгое значение true
    router.push('/profile');
    return null;
  }

  return (
    <div className="frame role-selection">
      <div className="logo-container">
        <img src="/logo.png" alt="Streamers Universe Logo" className="logo" />
      </div>
      <h2>Кто вы?</h2>
      <button id="streamerBtn" onClick={() => router.push('/auth?role=streamer')}>Я стример</button>
      <button id="subscriberBtn" onClick={() => router.push('/auth?role=subscriber')}>Я подписчик</button>
      <Stars />
    </div>
  );
};

// Экспортируем динамически загружаемый компонент
export default dynamic(() => Promise.resolve(HomeComponent), {
  ssr: false, // Отключаем серверный рендеринг (SSG/SSR)
});
