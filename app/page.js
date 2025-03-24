'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../styles/landing.module.css';
import Cookies from 'js-cookie';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Функция для проверки авторизации пользователя
    const checkAuth = async () => {
      try {
        console.log('Контекст аутентификации инициализирован, выполняем перенаправление');
        
        // Сначала пробуем получить данные из localStorage
        const storedUser = localStorage.getItem('twitch_user');
        const isAuthenticated = localStorage.getItem('is_authenticated') === 'true';
        
        if (storedUser && isAuthenticated) {
          try {
            const userData = JSON.parse(storedUser);
            if (userData && userData.id) {
              console.log('Пользователь авторизован, перенаправляем в меню');
              router.push('/menu');
              return;
            }
          } catch (e) {
            console.error('Ошибка при парсинге данных пользователя:', e);
          }
        }
        
        // Если в localStorage нет данных, проверяем cookie
        const cookieUser = Cookies.get('twitch_user');
        if (cookieUser) {
          try {
            const userData = JSON.parse(cookieUser);
            if (userData && userData.id) {
              console.log('Пользователь авторизован через cookie, перенаправляем в меню');
              // Сохраняем данные в localStorage для будущего использования
              localStorage.setItem('twitch_user', JSON.stringify(userData));
              localStorage.setItem('is_authenticated', 'true');
              router.push('/menu');
              return;
            }
          } catch (e) {
            console.error('Ошибка при парсинге данных из cookie:', e);
          }
        }
        
        // Пробуем получить данные с сервера
        const response = await fetch('/api/twitch/user', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          },
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          if (userData && userData.id) {
            console.log('Пользователь авторизован через API, перенаправляем в меню');
            localStorage.setItem('twitch_user', JSON.stringify(userData));
            localStorage.setItem('is_authenticated', 'true');
            router.push('/menu');
            return;
          }
        }
        
        // Если ни один из методов не сработал, перенаправляем на страницу авторизации
        console.log('Пользователь не авторизован, перенаправляем на страницу авторизации');
        router.push('/auth');
      } catch (error) {
        console.error('Ошибка при проверке аутентификации:', error);
        // В случае ошибки также перенаправляем на авторизацию
        router.push('/auth');
      } finally {
        setIsLoading(false);
      }
    };
    
    // Запускаем проверку авторизации
    checkAuth();
  }, [router]);
  
  // Показываем загрузочный экран, пока идет проверка авторизации
  return (
    <div className={styles.container}>
      {isLoading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>Загрузка...</p>
        </div>
      ) : (
        <div className={styles.content}>
          <h1 className={styles.title}>Streamers Universe</h1>
          <p className={styles.description}>Загрузка приложения...</p>
        </div>
      )}
    </div>
  );
}