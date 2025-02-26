'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import Layout from '../src/components/Layout';

// Динамически импортируем компонент Top для клиентского рендеринга
const Top = () => {
  return (
    <Layout>
      <div className="frame top">
        <h2>Топ Стримеров</h2>
        <p>Топ стримеров обновляется...</p>
      </div>
    </Layout>
  );
};

// Экспортируем динамически загружаемый компонент
export default dynamic(() => Promise.resolve(Top), {
  ssr: false, // Отключаем серверный рендеринг (SSG/SSR)
});
