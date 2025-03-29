'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import styles from '../auth.module.css';
import Cookies from 'js-cookie';
import { DataStorage } from '../../utils/dataStorage';

// Создаем отдельный компонент для использования useSearchParams
function AuthResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Обработка результатов авторизации...');
  const redirectTimeoutRef = useRef(null);
  const hasRedirectedRef = useRef(false);

  // Функция для перенаправления в меню
  const redirectToMenu = () => {
    if (!hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      router.push('/menu');
    }
  };

  useEffect(() => {
    // Очищаем потенциальные флаги конфликтов
    const clientStorage = DataStorage.getInstance();
    clientStorage.removeItem('menu_to_auth_redirect');
    
    // Получаем параметры URL
    const error = searchParams.get('error');
    const errorMessage = searchParams.get('message') || 'Произошла ошибка при авторизации';
    const code = searchParams.get('code');
    const accessToken = searchParams.get('access_token');
    const twitchUserData = searchParams.get('userData');
    
    console.log('Страница результата авторизации:', { 
      error: !!error, 
      hasCode: !!code, 
      hasToken: !!accessToken,
      hasUserData: !!twitchUserData 
    });
    
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
    } else if (code || accessToken || twitchUserData) {
      // Если есть код авторизации, токен доступа или данные пользователя, обрабатываем их
      setStatus('success');
      setMessage('Авторизация успешна! Загружаем данные...');
      
      // Проверяем есть ли токен и данные пользователя
      if (accessToken && twitchUserData) {
        try {
          // Парсим данные пользователя из URL
          const userData = JSON.parse(decodeURIComponent(twitchUserData));
          
          // Если есть токен и данные пользователя, сохраняем их
          if (userData && userData.id) {
            console.log('Сохраняем данные пользователя и токен');
            
            // Сохраняем токен в куки
            Cookies.set('twitch_access_token', accessToken, { 
              expires: 7, // 7 дней
              secure: window.location.protocol === 'https:', 
              sameSite: 'lax'
            });
            
            // Сохраняем данные пользователя
            clientStorage.setItem('twitch_user', JSON.stringify(userData));
            
            console.log('Выполняем вход через useAuth');
            login(userData, accessToken);
            
            // Перенаправляем в меню через 0.5 секунды
            redirectTimeoutRef.current = setTimeout(redirectToMenu, 500);
            return;
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
        
        // Проверяем, есть ли код авторизации от Twitch и обрабатываем его
        if (code) {
          try {
            setMessage('Получаем токен доступа...');
            
            // Обмениваем код на токен на стороне клиента
            fetch(`/api/auth/twitch/token?code=${code}`)
              .then(response => {
                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
              })
              .then(data => {
                if (data.accessToken && data.userData) {
                  // Сохраняем токен и данные пользователя
                  Cookies.set('twitch_access_token', data.accessToken, { 
                    expires: 7, 
                    secure: window.location.protocol === 'https:', 
                    sameSite: 'lax'
                  });
                  
                  clientStorage.setItem('twitch_user', JSON.stringify(data.userData));
                  
                  // Авторизуем пользователя
                  login(data.userData, data.accessToken);
                  setMessage('Авторизация успешна! Перенаправляем в меню...');
                  
                  // Перенаправляем в меню
                  redirectTimeoutRef.current = setTimeout(redirectToMenu, 500);
                } else {
                  throw new Error('Отсутствуют данные токена или пользователя в ответе API');
                }
              })
              .catch(error => {
                console.error('Ошибка при обработке кода авторизации:', error);
                setStatus('error');
                setMessage('Ошибка при получении токена доступа. Пожалуйста, попробуйте снова.');
                
                // Перенаправляем на страницу авторизации через 2 секунды
                redirectTimeoutRef.current = setTimeout(() => {
                  router.push('/auth');
                }, 2000);
              });
            
            return;
          } catch (error) {
            console.error('Ошибка при обработке кода авторизации:', error);
            setStatus('error');
            setMessage('Ошибка при обработке кода авторизации.');
            
            // Перенаправляем на страницу авторизации через 2 секунды
            redirectTimeoutRef.current = setTimeout(() => {
              router.push('/auth');
            }, 2000);
            return;
          }
        } else {
          setStatus('error');
          setMessage('Не удалось получить данные пользователя или токен доступа. Пожалуйста, попробуйте войти снова.');
          
          // Перенаправляем на страницу авторизации через 2 секунды
          redirectTimeoutRef.current = setTimeout(() => {
            router.push('/auth');
          }, 2000);
          return;
        }
      }
      
      // Запасной путь редиректа, если не сработал ни один из вышеперечисленных сценариев
      redirectTimeoutRef.current = setTimeout(redirectToMenu, 800);
    } else {
      // Если нет явных параметров, проверяем данные аутентификации
      const userData = clientStorage.getItem('twitch_user') || clientStorage.getItem('cookie_twitch_user');
      const accessToken = Cookies.get('twitch_access_token') || clientStorage.getItem('cookie_twitch_access_token');
      
      if (userData && accessToken) {
        // Если данные и токен есть, считаем что авторизация успешна
        setStatus('success');
        setMessage('Авторизация успешна! Перенаправляем в меню...');
        
        // Пытаемся выполнить вход через useAuth с текущими данными
        try {
          const parsedUserData = typeof userData === 'string' ? JSON.parse(userData) : userData;
          login(parsedUserData, accessToken);
        } catch (error) {
          console.error('Ошибка при обработке существующих данных пользователя:', error);
          // Продолжаем выполнение даже при ошибке
        }
        
        // Перенаправляем в меню через 1 секунду
        redirectTimeoutRef.current = setTimeout(redirectToMenu, 1000);
      } else {
        // Иначе считаем что произошла ошибка
        setStatus('error');
        setMessage('Не удалось получить данные пользователя');
        
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
      }
    }
    
    // Очищаем таймаут при размонтировании
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, [searchParams, router, login, redirectToMenu]);

  return (
    <div className={styles.oldContainer}>
      <div className={styles.stars}></div>
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
            className={styles.oldAuthButton}
            onClick={() => router.push('/auth')}
            style={{ fontSize: '1rem', padding: '10px 20px', margin: '20px auto', display: 'block' }}
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