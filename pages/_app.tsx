"use client";

import React from 'react';
import { AppProps } from 'next/app';
import '../styles/global.css'; // Относительный путь от pages/ к корню проекта
import CookieChecker from '../components/CookieChecker';
import Logo from '../components/Logo';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <React.Fragment>
      <div style={{ 
        position: 'fixed', 
        top: '10px', 
        left: '10px', 
        zIndex: 1000 
      }}>
        <Logo size={40} />
      </div>
      <Component {...pageProps} />
      <CookieChecker />
    </React.Fragment>
  );
}
