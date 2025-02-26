'use client';

import dynamic from 'next/dynamic';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../src/context/AuthContext';
import Stars from '../src/components/Stars';

// Динамически импортируем компонент Home для клиентского рендеринга
const HomeComponent = () => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null; // Предотвращаем рендеринг до загрузки клиента

  if (isAuthenticated) {
    router.push('/profile');
    return null;
  }

  return (
    <div className="frame role-selection">
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
