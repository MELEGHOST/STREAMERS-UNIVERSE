'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import Layout from '../src/components/Layout';

// Динамически импортируем компонент Home для клиентского рендеринга
const Home = () => {
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
