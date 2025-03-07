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
        
        // Проверяем, изменился ли домен
        const currentDomain = window.location.origin;
        const savedDomain = localStorage.getItem('current_domain');
        
        if (savedDomain && currentDomain !== savedDomain) {
          console.log('Обнаружено изменение домена при переходе:', { savedDomain, currentDomain });
          // Обновляем сохраненный домен
          localStorage.setItem('current_domain', currentDomain);
        }
      }, 300);
    };

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    // Проверяем и сохраняем текущий домен при загрузке страницы
    if (typeof window !== 'undefined') {
      const currentDomain = window.location.origin;
      localStorage.setItem('current_domain', currentDomain);
      console.log('Текущий домен при загрузке:', currentDomain);
    }

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  return (
    <>
      <Component {...pageProps} />
      <CookieChecker />
    </>
  );
}
