import React, { useEffect } from 'react';
import { AppProps } from 'next/app';
import '../styles/global.css'; // Относительный путь от pages/ к корню проекта
import CookieChecker from '../components/CookieChecker';
import SimpleLogo from '../components/SimpleLogo';
import { useRouter } from 'next/router';

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  
  // Добавляем обработчик переходов между страницами для плавного перехода
  useEffect(() => {
    const handleStart = () => {
      // Добавляем класс для плавного перехода
      document.body.classList.add('page-transition');
      console.log('Начало перехода между страницами');
    };

    const handleComplete = () => {
      // Удаляем класс после завершения перехода
      setTimeout(() => {
        document.body.classList.remove('page-transition');
        console.log('Завершение перехода между страницами');
      }, 300);
    };

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

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
