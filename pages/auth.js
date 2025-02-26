// Страница авторизации через Twitch
'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import Layout from '../src/components/Layout';
import TwitchAuth from '../src/components/TwitchAuth';

// Динамически импортируем компонент Auth для клиентского рендеринга
const Auth = () => {
  // Возвращаем layout с компонентом авторизации
  return (
    <Layout>
      <TwitchAuth />
    </Layout>
  );
};

// Экспортируем динамически загружаемый компонент
export default dynamic(() => Promise.resolve(Auth), {
  ssr: false, // Отключаем серверный рендеринг (SSG/SSR)
});
