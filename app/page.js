'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import clientStorage from './utils/clientStorage';

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
        const userData = clientStorage.getItem('twitch_user') || 
                         clientStorage.getItem('cookie_twitch_user');
        
        if (userData) {
          console.log('Найдены данные пользователя, перенаправляем в меню');
          router.push('/menu');
        } else {
          console.log('Данные пользователя не найдены, перенаправляем на страницу авторизации');
          router.push('/auth');
        }
      }
    }, 2000); // Увеличиваем таймаут до 2 секунд
    
    // Если контекст аутентификации инициализирован, перенаправляем сразу
    if (isInitialized && !hasRedirectedRef.current) {
      console.log('Контекст аутентификации инициализирован, проверяем состояние авторизации');
      
      // Проверяем, нет ли уже активного перенаправления
      if (clientStorage.getItem('redirect_in_progress')) {
        console.log('Обнаружено активное перенаправление, отменяем новое');
        return;
      }
      
      // Устанавливаем флаг перенаправления
      clientStorage.setItem('redirect_in_progress', 'true');
      
      // Очищаем флаг перенаправления через 5 секунд
      setTimeout(() => {
        clientStorage.removeItem('redirect_in_progress');
      }, 5000);
      
      clearTimeout(timeoutRef.current);
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