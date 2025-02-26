'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import Layout from '../src/components/Layout';
import Profile from '../src/components/Profile';

// Динамически импортируем компонент ProfilePage для клиентского рендеринга
const ProfilePage = () => {
  return (
    <Layout>
      <Profile />
    </Layout>
  );
};

// Экспортируем динамически загружаемый компонент
export default dynamic(() => Promise.resolve(ProfilePage), {
  ssr: false, // Отключаем серверный рендеринг (SSG/SSR)
});
