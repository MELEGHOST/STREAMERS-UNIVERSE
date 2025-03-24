'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import clientStorage from './utils/clientStorage';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAuth();
  const hasRedirectedRef = useRef(false);
  
  useEffect(() => {
    // Если уже было выполнено перенаправление, выходим
    if (hasRedirectedRef.current) {
      return;
    }
    
    // Создаем функцию перенаправления
    const performRedirect = () => {
      // Предотвращаем множественные перенаправления
      if (hasRedirectedRef.current) return;
      hasRedirectedRef.current = true;
      
      // Получаем данные пользователя из всех возможных источников
      const userData = clientStorage.getItem('twitch_user') || 
                       clientStorage.getItem('cookie_twitch_user');
      
      // Устанавливаем куку для отслеживания состояния перенаправления
      clientStorage.setItem('redirect_state', 'redirecting');
      
      // Очищаем состояние перенаправления через 5 секунд
      setTimeout(() => {
        clientStorage.removeItem('redirect_state');
      }, 5000);
      
      // Выполняем перенаправление
      if (isAuthenticated || userData) {
        console.log('Пользователь авторизован, перенаправляем в меню');
        router.push('/menu');
      } else {
        console.log('Пользователь не авторизован, перенаправляем на страницу авторизации');
        router.push('/auth');
      }
    };
    
    // Если контекст аутентификации инициализирован, перенаправляем сразу
    if (isInitialized) {
      console.log('Контекст аутентификации инициализирован, выполняем перенаправление');
      performRedirect();
    } else {
      // Устанавливаем таймаут для гарантированного перенаправления если isInitialized не сработает
      const timeoutId = setTimeout(() => {
        console.log('Таймаут перенаправления на главной странице');
        performRedirect();
      }, 2000);
      
      // Очищаем таймаут при размонтировании компонента
      return () => clearTimeout(timeoutId);
    }
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