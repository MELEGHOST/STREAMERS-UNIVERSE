'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import styles from '../auth.module.css';
import clientStorage from '../../utils/clientStorage';

// Создаем отдельный компонент для использования useSearchParams
function AuthResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Обработка результатов авторизации...');
  const redirectTimeoutRef = useRef(null);
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    // Очищаем потенциальные флаги конфликтов
    clientStorage.removeItem('menu_to_auth_redirect');
    
    // Функция для перенаправления пользователя
    const redirectToMenu = () => {
      if (!hasRedirectedRef.current) {
        hasRedirectedRef.current = true;
        console.log('Перенаправляем пользователя в меню после успешной авторизации');
        
        // Сначала проверяем, что данные точно есть в localStorage
        const userData = clientStorage.getItem('twitch_user') || clientStorage.getItem('cookie_twitch_user');
        if (!userData) {
          console.error('Нет данных пользователя в хранилище перед редиректом в меню!');
          setStatus('error');
          setMessage('Не удалось получить данные пользователя. Пожалуйста, попробуйте войти снова.');
          
          // Перенаправляем на страницу авторизации через 2 секунды
          redirectTimeoutRef.current = setTimeout(() => {
            router.push('/auth');
          }, 2000);
          return;
        }
        
        // Устанавливаем флаг перенаправления
        clientStorage.setItem('auth_to_menu_redirect', 'true');
        
        // Перенаправляем в меню
        router.push('/menu');
      }
    };
    
    // Обрабатываем параметры URL
    const error = searchParams.get('error');
    const success = searchParams.get('success');
    const errorMessage = searchParams.get('message');
    
    if (error) {
      // Если есть ошибка
      console.error('Ошибка авторизации:', error, errorMessage);
      setStatus('error');
      setMessage(errorMessage || 'Произошла ошибка при авторизации через Twitch');
      
      // Очищаем флаги редиректов
      clientStorage.removeItem('auth_to_menu_redirect');
      clientStorage.removeItem('menu_to_auth_redirect');
      
      // Перенаправляем на страницу авторизации через 2 секунды
      redirectTimeoutRef.current = setTimeout(() => {
        if (!hasRedirectedRef.current) {
          hasRedirectedRef.current = true;
          router.push('/auth');
        }
      }, 2000);
    } else if (success === 'true') {
      // Если авторизация успешна
      console.log('Успешная авторизация через Twitch');
      setStatus('success');
      setMessage('Авторизация успешно выполнена! Перенаправляем в меню...');
      
      // Получаем данные пользователя из localStorage
      const userData = clientStorage.getItem('twitch_user') || clientStorage.getItem('cookie_twitch_user');
      const accessToken = clientStorage.getItem('cookie_twitch_access_token') || clientStorage.getItem('twitch_token');
      
      if (userData && accessToken) {
        try {
          // Парсим данные и обновляем контекст авторизации
          const parsedUserData = typeof userData === 'string' ? JSON.parse(userData) : userData;
          login(parsedUserData, accessToken);
          
          // Дополнительно убеждаемся, что данные сохранены в правильных местах
          if (!clientStorage.getItem('twitch_user')) {
            clientStorage.setItem('twitch_user', typeof userData === 'string' ? userData : JSON.stringify(userData));
          }
          if (!clientStorage.getItem('cookie_twitch_user')) {
            clientStorage.setItem('cookie_twitch_user', typeof userData === 'string' ? userData : JSON.stringify(userData));
          }
        } catch (error) {
          console.error('Ошибка при обработке данных пользователя:', error);
          
          // Если есть ошибка при обработке данных, показываем ее
          setStatus('error');
          setMessage('Ошибка при обработке данных пользователя. Пожалуйста, попробуйте войти снова.');
          
          // Перенаправляем на страницу авторизации через 2 секунды
          redirectTimeoutRef.current = setTimeout(() => {
            router.push('/auth');
          }, 2000);
          return;
        }
      } else {
        console.error('Отсутствуют данные пользователя или токен доступа');
        setStatus('error');
        setMessage('Не удалось получить данные пользователя или токен доступа. Пожалуйста, попробуйте войти снова.');
        
        // Перенаправляем на страницу авторизации через 2 секунды
        redirectTimeoutRef.current = setTimeout(() => {
          router.push('/auth');
        }, 2000);
        return;
      }
      
      // Перенаправляем в меню через 0.8 секунды - сделаем быстрее
      redirectTimeoutRef.current = setTimeout(redirectToMenu, 800);
    } else {
      // Если нет явных параметров, проверяем данные аутентификации
      const userData = clientStorage.getItem('twitch_user') || clientStorage.getItem('cookie_twitch_user');
      
      if (userData) {
        // Если данные есть, считаем что авторизация успешна
        setStatus('success');
        setMessage('Авторизация успешно выполнена! Перенаправляем в меню...');
        
        // Перенаправляем в меню через 1.5 секунды
        redirectTimeoutRef.current = setTimeout(redirectToMenu, 1500);
      } else {
        // Иначе считаем что произошла ошибка
        setStatus('error');
        setMessage('Не удалось получить данные пользователя');
        
        // Очищаем флаги редиректов
        clientStorage.removeItem('auth_to_menu_redirect');
        clientStorage.removeItem('menu_to_auth_redirect');
        
        // Перенаправляем на страницу авторизации через 3 секунды
        redirectTimeoutRef.current = setTimeout(() => {
          if (!hasRedirectedRef.current) {
            hasRedirectedRef.current = true;
            router.push('/auth');
          }
        }, 3000);
      }
    }
    
    // Очищаем таймаут при размонтировании
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, [searchParams, router, login]);

  return (
    <div className={styles.container}>
      <div className={styles.authContent}>
        <h1 className={styles.title}>
          {status === 'loading' ? 'Обработка авторизации' : 
           status === 'success' ? 'Авторизация успешна' : 'Ошибка авторизации'}
        </h1>
        
        <div className={status === 'error' ? styles.errorMessage : styles.successMessage}>
          {message}
        </div>
        
        {status === 'loading' && (
          <div className={styles.loadingSpinner} style={{ margin: '30px auto' }}></div>
        )}
        
        {status === 'success' && (
          <div className={styles.loadingSpinner} style={{ margin: '30px auto' }}></div>
        )}
        
        {status === 'error' && (
          <button 
            className={styles.authButton}
            onClick={() => router.push('/auth')}
          >
            Вернуться на страницу авторизации
          </button>
        )}
      </div>
    </div>
  );
}

// Компонент-обертка с Suspense boundary
export default function AuthResult() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Загрузка...</p>
        </div>
      </div>
    }>
      <AuthResultContent />
    </Suspense>
  );
} 