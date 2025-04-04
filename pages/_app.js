import React, { useEffect, useState } from 'react';
import '../styles/global.css'; // Относительный путь от pages/ к корню проекта
// import CookieChecker from '../components/CookieChecker'; // Удалено
import ThemeProvider from '../components/ThemeProvider';
import { useRouter } from 'next/router';
import { AuthProvider } from '../contexts/AuthContext';

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [savedDomain, setSavedDomain] = useState('');
  
  // Восстанавливаем обработчик смены домена
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentDomain = window.location.hostname;
      // console.log('Текущий домен при загрузке:', currentDomain);
      setSavedDomain(currentDomain);
    }
  }, []); // Выполняем один раз при монтировании

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

    const handleComplete = (url) => {
      // console.log('Завершение перехода между страницами');
      
      // Проверяем, изменился ли домен
      const currentDomain = new URL(url, window.location.origin).hostname;
      if (savedDomain && currentDomain !== savedDomain) {
        // console.log('Обнаружено изменение домена при переходе:', { savedDomain, currentDomain });
        // Обновляем сохраненный домен
        setSavedDomain(currentDomain); // Обновляем состояние
      }
    };

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete); // Также обрабатываем ошибки

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router.events, savedDomain]); // Добавляем savedDomain в зависимости

  return (
    <AuthProvider>
      <ThemeProvider>
        <Component {...pageProps} />
        {/* <CookieChecker /> */}
      </ThemeProvider>
    </AuthProvider>
  );
} 