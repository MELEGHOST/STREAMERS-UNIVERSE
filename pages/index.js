// Главная страница для выбора роли
'use client';

import dynamic from 'next/dynamic';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../src/context/AuthContext';
import Layout from '../src/components/Layout';

// Динамически импортируем компонент Home для клиентского рендеринга
const Home = () => {
  // Роутер для навигации
  const router = useRouter();
  // Получаем состояние авторизации
  const { isAuthenticated } = useAuth() || {};
  // Состояние для проверки монтирования компонента
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Устанавливаем флаг монтирования
    setIsMounted(true);
  }, []);

  // Предотвращаем рендеринг до загрузки клиента
  if (!isMounted) return null;

  // Если пользователь авторизован, перенаправляем в профиль
  if (isAuthenticated === true) {
    router.push('/profile');
    return null;
  }

  return (
    <Layout>
      <div className="frame role-selection">
        <h2>Кто вы?</h2>
        <button id="streamerBtn" onClick={() => window.location.href = '/auth?role=streamer'}>Я стример</button>
        <button id="subscriberBtn" onClick={() => window.location.href = '/auth?role=subscriber'}>Я подписчик</button>
      </div>
    </Layout>
  );
};

// Экспортируем динамически загружаемый компонент
export default dynamic(() => Promise.resolve(Home), {
  ssr: false, // Отключаем серверный рендеринг (SSG/SSR)
});
