"use client";

import { useEffect, useState } from 'react';
import { hasCookie, getCookie } from '../utils/cookies';

export default function CookieChecker() {
  const [cookieStatus, setCookieStatus] = useState({
    twitch_access_token: false,
    twitch_refresh_token: false,
    twitch_user: false,
    twitch_state: false
  });
  const [localStorageStatus, setLocalStorageStatus] = useState({
    cookie_twitch_access_token: false,
    cookie_twitch_refresh_token: false,
    cookie_twitch_user: false,
    twitch_user: false
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Проверяем, нужно ли отображать компонент
    // Отображаем только в режиме разработки или если в URL есть параметр debug=true
    const isDev = process.env.NODE_ENV === 'development';
    
    // Безопасно получаем параметры URL
    let debugMode = false;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      debugMode = urlParams.get('debug') === 'true';
    } catch (e) {
      console.error('Ошибка при получении параметров URL:', e);
    }
    
    setIsVisible(isDev || debugMode);

    // Проверяем наличие куков
    const checkCookies = () => {
      try {
        // Проверяем куки
        const cookiesStatus = {
          twitch_access_token: hasCookie('twitch_access_token'),
          twitch_refresh_token: hasCookie('twitch_refresh_token'),
          twitch_user: hasCookie('twitch_user'),
          twitch_state: hasCookie('twitch_state')
        };
        setCookieStatus(cookiesStatus);
        
        // Безопасно проверяем localStorage
        const localStorageItems = {
          cookie_twitch_access_token: false,
          cookie_twitch_refresh_token: false,
          cookie_twitch_user: false,
          twitch_user: false
        };
        
        // Проверяем доступность localStorage
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            localStorageItems.cookie_twitch_access_token = !!localStorage.getItem('cookie_twitch_access_token');
            localStorageItems.cookie_twitch_refresh_token = !!localStorage.getItem('cookie_twitch_refresh_token');
            localStorageItems.cookie_twitch_user = !!localStorage.getItem('cookie_twitch_user');
            localStorageItems.twitch_user = !!localStorage.getItem('twitch_user');
            
            setLocalStorageStatus(localStorageItems);
            
            // Проверяем, изменился ли домен
            const currentDomain = window.location.origin;
            const savedDomain = localStorage.getItem('current_domain');
            
            // Если домен изменился и у нас есть данные в localStorage, но нет в куках
            if (savedDomain && currentDomain !== savedDomain) {
              console.log('Обнаружено изменение домена:', { savedDomain, currentDomain });
              
              // Если в localStorage есть данные, но в куках нет, восстанавливаем куки
              if (localStorageItems.twitch_user && !cookiesStatus.twitch_user) {
                try {
                  const userData = localStorage.getItem('twitch_user');
                  if (userData) {
                    document.cookie = `twitch_user=${encodeURIComponent(userData)}; path=/; max-age=86400; samesite=lax`;
                    console.log('Восстановлены куки twitch_user из localStorage');
                  }
                } catch (e) {
                  console.error('Ошибка при восстановлении куки twitch_user:', e);
                }
              }
              
              // Обновляем сохраненный домен
              try {
                localStorage.setItem('current_domain', currentDomain);
              } catch (e) {
                console.error('Ошибка при обновлении домена в localStorage:', e);
              }
            } else if (!savedDomain) {
              // Если домен еще не сохранен, сохраняем текущий
              try {
                localStorage.setItem('current_domain', currentDomain);
              } catch (e) {
                console.error('Ошибка при сохранении домена в localStorage:', e);
              }
            }
          } catch (localStorageError) {
            console.error('Ошибка при работе с localStorage:', localStorageError);
          }
        }
        
        // Выводим информацию в консоль только в режиме отладки
        if (isDev || debugMode) {
          console.log('Статус куков:', cookiesStatus);
          console.log('Статус localStorage:', localStorageItems);
        }
      } catch (e) {
        console.error('Общая ошибка при проверке куков и localStorage:', e);
      }
    };

    // Проверяем куки при загрузке компонента
    checkCookies();

    // Проверяем куки только если компонент видимый и только раз в 30 секунд
    let interval;
    if (isDev || debugMode) {
      interval = setInterval(checkCookies, 30000); // Увеличиваем интервал до 30 секунд
    }

    // Очищаем интервал при размонтировании компонента
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // Если компонент не должен быть видимым, возвращаем null
  if (!isVisible) return null;

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '10px', 
      right: '10px', 
      backgroundColor: 'rgba(0, 0, 0, 0.7)', 
      color: 'white', 
      padding: '10px', 
      borderRadius: '5px',
      zIndex: 9999,
      maxWidth: '300px',
      fontSize: '12px'
    }}>
      <h4 style={{ margin: '0 0 5px 0' }}>Статус куков:</h4>
      <ul style={{ margin: 0, padding: '0 0 0 20px' }}>
        {Object.entries(cookieStatus).map(([name, exists]) => (
          <li key={name} style={{ color: exists ? 'lightgreen' : 'red' }}>
            {name}: {exists ? 'Есть' : 'Нет'}
          </li>
        ))}
      </ul>
      <h4 style={{ margin: '10px 0 5px 0' }}>Статус localStorage:</h4>
      <ul style={{ margin: 0, padding: '0 0 0 20px' }}>
        {Object.entries(localStorageStatus).map(([name, exists]) => (
          <li key={name} style={{ color: exists ? 'lightgreen' : 'red' }}>
            {name}: {exists ? 'Есть' : 'Нет'}
          </li>
        ))}
      </ul>
    </div>
  );
} 