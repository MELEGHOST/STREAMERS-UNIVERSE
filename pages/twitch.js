'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import Layout from '../src/components/Layout';

// Динамически импортируем компонент Twitch для клиентского рендеринга
const Twitch = () => {
  return (
    <Layout>
      <div className="frame twitch">
        <h2>Twitch Трекер</h2>
        <p>Twitch трекер в разработке...</p>
      </div>
    </Layout>
  );
};

// Экспортируем динамически загружаемый компонент
export default dynamic(() => Promise.resolve(Twitch), {
  ssr: false, // Отключаем серверный рендеринг (SSG/SSR)
});
