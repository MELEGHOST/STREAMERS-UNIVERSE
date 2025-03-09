'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAuth();
  const hasRedirectedRef = useRef(false);
  
  useEffect(() => {
    // Предотвращаем повторные перенаправления
    if (hasRedirectedRef.current) {
      return;
    }
    
    // Устанавливаем таймаут для предотвращения бесконечной загрузки
    const redirectTimeout = setTimeout(() => {
      if (!hasRedirectedRef.current) {
        console.log('Таймаут перенаправления, принудительно перенаправляем на /menu');
        hasRedirectedRef.current = true;
        router.push('/menu');
      }
    }, 3000); // 3 секунды таймаут
    
    // Если контекст аутентификации инициализирован, перенаправляем на соответствующую страницу
    if (isInitialized) {
      clearTimeout(redirectTimeout);
      if (!hasRedirectedRef.current) {
        console.log('Контекст аутентификации инициализирован, перенаправляем на /menu');
        hasRedirectedRef.current = true;
        router.push('/menu');
      }
    }
    
    // Очищаем таймаут при размонтировании компонента
    return () => clearTimeout(redirectTimeout);
  }, [isInitialized, isAuthenticated, router]);
  
  // Показываем индикатор загрузки
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      background: 'linear-gradient(to bottom, #0f0c29, #302b63, #24243e)',
      color: 'white'
    }}>
      <div style={{ 
        width: '50px', 
        height: '50px', 
        border: '5px solid rgba(255, 255, 255, 0.3)', 
        borderTop: '5px solid white', 
        borderRadius: '50%', 
        animation: 'spin 1s linear infinite',
        marginBottom: '20px'
      }} />
      <p>Загрузка приложения...</p>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}