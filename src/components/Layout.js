// Лейаут для основной структуры страницы
'use client';

import React from 'react';
import Stars from './Stars';

const Layout = ({ children }) => {
  return (
    <div className="container">
      <div className="logo-container">
        <img src="/logo.png" alt="Лого Streamers Universe" className="logo" />
      </div>
      {children}
      <Stars />
    </div>
  );
};

export default Layout;
