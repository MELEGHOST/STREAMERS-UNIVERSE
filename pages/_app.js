import React, { useEffect, useState } from 'react';
import '../styles/global.css'; // Относительный путь от pages/ к корню проекта
// import CookieChecker from '../components/CookieChecker'; // Удалено
import ThemeProvider from '../components/ThemeProvider';
import { useRouter } from 'next/router';
import { AuthProvider } from '../contexts/AuthContext';

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [savedDomain, setSavedDomain] = useState('');
  
  // Добавляем обработчик переходов между страницами для плавного перехода
  useEffect(() => {
    const handleStart = (url) => {
      // console.log('Начало перехода между страницами');
      const nextDomain = new URL(url, window.location.origin).hostname;
      if (savedDomain && nextDomain !== savedDomain) {
        // console.log('Обнаружено изменение домена при переходе:', { savedDomain, currentDomain: nextDomain });
        // Тут можно добавить логику, если смена домена критична
      }
    };

    const handleComplete = () => {
      // Удаляем класс после завершения перехода
      setTimeout(() => {
        document.body.classList.remove('page-transition');
        // console.log('Завершение перехода между страницами');
        
        // Проверяем, изменился ли домен
        const currentDomain = window.location.origin;
        const savedDomain = localStorage.getItem('current_domain');
        
        if (savedDomain && currentDomain !== savedDomain) {
          // console.log('Обнаружено изменение домена при переходе:', { savedDomain, currentDomain });
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
      const currentDomain = window.location.hostname;
      // console.log('Текущий домен при загрузке:', currentDomain);
      setSavedDomain(currentDomain);
    }

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  return (
    <AuthProvider>
      <ThemeProvider>
        <Component {...pageProps} />
        {/* <CookieChecker /> */}
      </ThemeProvider>
    </AuthProvider>
  );
} 