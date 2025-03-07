import React from 'react';
import { AppProps } from 'next/app';
import '../styles/global.css'; // Относительный путь от pages/ к корню проекта
import CookieChecker from '../components/CookieChecker';
import SimpleLogo from '../components/SimpleLogo';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <div style={{ 
        position: 'fixed', 
        top: '10px', 
        left: '10px', 
        zIndex: 1000 
      }}>
        <SimpleLogo size={40} />
      </div>
      <Component {...pageProps} />
      <CookieChecker />
    </>
  );
}
