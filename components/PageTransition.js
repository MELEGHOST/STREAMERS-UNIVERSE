'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

export default function PageTransition({ children }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [prevPath, setPrevPath] = useState('');

  // Создаем строку текущего пути для отслеживания изменений
  const currentPath = pathname + searchParams.toString();

  // Функция для обработки изменения пути
  const handleRouteChange = useCallback(() => {
    if (prevPath && prevPath !== currentPath) {
      console.log('Начало перехода между страницами');
      setIsLoading(true);
      
      // Имитируем завершение перехода
      setTimeout(() => {
        console.log('Завершение перехода между страницами');
        setIsLoading(false);
      }, 300);
    }
    
    setPrevPath(currentPath);
  }, [currentPath, prevPath]);

  useEffect(() => {
    handleRouteChange();
  }, [pathname, searchParams, handleRouteChange]);

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