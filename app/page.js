'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAuth();
  const hasRedirectedRef = useRef(false);
  const timeoutRef = useRef(null);
  
  useEffect(() => {
    // Если уже было выполнено перенаправление, выходим
    if (hasRedirectedRef.current) {
      return;
    }
    
    // Устанавливаем таймаут для гарантированного перенаправления
    timeoutRef.current = setTimeout(() => {
      if (!hasRedirectedRef.current) {
        console.log('Таймаут перенаправления на главной странице');
        hasRedirectedRef.current = true;
        
        // Проверяем, есть ли данные пользователя в localStorage
        const userData = localStorage.getItem('twitch_user') || 
                         localStorage.getItem('cookie_twitch_user');
        
        if (userData) {
          console.log('Найдены данные пользователя, перенаправляем в меню');
          router.push('/menu');
        } else {
          console.log('Данные пользователя не найдены, перенаправляем на страницу авторизации');
          router.push('/auth');
        }
      }
    }, 1500); // 1.5 секунды таймаут
    
    // Если контекст аутентификации инициализирован, перенаправляем сразу
    if (isInitialized && !hasRedirectedRef.current) {
      clearTimeout(timeoutRef.current);
      console.log('Контекст аутентификации инициализирован, проверяем состояние авторизации');
      hasRedirectedRef.current = true;
      
      if (isAuthenticated) {
        console.log('Пользователь авторизован, перенаправляем в меню');
        router.push('/menu');
      } else {
        console.log('Пользователь не авторизован, перенаправляем на страницу авторизации');
        router.push('/auth');
      }
    }
    
    // Очищаем таймаут при размонтировании компонента
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isInitialized, isAuthenticated, router]);
  
  // Показываем простой индикатор загрузки
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