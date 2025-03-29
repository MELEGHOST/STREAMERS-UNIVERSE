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
        
        // Безопасная проверка доступа к localStorage
        const isLocalStorageAvailable = (() => {
          try {
            const testKey = '__test__';
            window.localStorage.setItem(testKey, testKey);
            window.localStorage.removeItem(testKey);
            return true;
          } catch (e) {
            return false;
          }
        })();
        
        // Сначала пробуем получить данные из localStorage (если он доступен)
        let isUserAuthenticated = false;
        if (isLocalStorageAvailable) {
          try {
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
                // Удаляем некорректные данные
                localStorage.removeItem('twitch_user');
                localStorage.removeItem('is_authenticated');
              }
            }
          } catch (e) {
            console.error('Ошибка при работе с localStorage:', e);
          }
        }
        
        // Если в localStorage нет данных, проверяем cookie
        try {
          const cookieUser = Cookies.get('twitch_user');
          if (cookieUser) {
            try {
              const userData = JSON.parse(cookieUser);
              if (userData && userData.id) {
                console.log('Пользователь авторизован через cookie, перенаправляем в меню');
                // Сохраняем данные в localStorage для будущего использования, если он доступен
                if (isLocalStorageAvailable) {
                  try {
                    localStorage.setItem('twitch_user', JSON.stringify(userData));
                    localStorage.setItem('is_authenticated', 'true');
                  } catch (e) {
                    console.error('Ошибка при сохранении в localStorage:', e);
                  }
                }
                router.push('/menu');
                return;
              }
            } catch (e) {
              console.error('Ошибка при парсинге данных из cookie:', e);
              // Удаляем некорректные данные
              Cookies.remove('twitch_user');
            }
          }
        } catch (e) {
          console.error('Ошибка при работе с cookies:', e);
        }
        
        // Пробуем получить данные с сервера
        try {
          const response = await fetch('/api/twitch/user', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache'
            },
            credentials: 'include'
          });
          
          if (response.ok) {
            try {
              const userData = await response.json();
              if (userData && userData.id) {
                console.log('Пользователь авторизован через API, перенаправляем в меню');
                // Сохраняем данные в localStorage, если он доступен
                if (isLocalStorageAvailable) {
                  try {
                    localStorage.setItem('twitch_user', JSON.stringify(userData));
                    localStorage.setItem('is_authenticated', 'true');
                  } catch (e) {
                    console.error('Ошибка при сохранении в localStorage:', e);
                  }
                }
                router.push('/menu');
                return;
              }
            } catch (e) {
              console.error('Ошибка при парсинге данных с сервера:', e);
            }
          }
        } catch (fetchError) {
          console.error('Ошибка при запросе к API:', fetchError);
        }
        
        // Если ни один из методов не сработал, перенаправляем на страницу авторизации
        console.log('Пользователь не авторизован, перенаправляем на страницу авторизации');
        router.push('/auth');
      } catch (_) {
        console.error('Ошибка при проверке аутентификации:', _);
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