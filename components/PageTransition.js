'use client';

import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function PageTransition({ children }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    function handleStart() {
      console.log('Начало перехода между страницами');
      setIsLoading(true);
    }

    function handleComplete() {
      console.log('Завершение перехода между страницами');
      setIsLoading(false);
    }

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  if (isLoading) {
    return (
      <div>
        <div className="global-loading">
          <div className="global-spinner"></div>
        </div>
        <div style={{ opacity: 0 }}>{children}</div>
      </div>
    );
  }

  return <div style={{ opacity: 1, transition: 'opacity 0.3s ease-in-out' }}>{children}</div>;
} 