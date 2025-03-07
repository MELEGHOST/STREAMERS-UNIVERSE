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
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Проверяем, нужно ли отображать компонент
    // Отображаем только в режиме разработки или если в URL есть параметр debug=true
    const isDev = process.env.NODE_ENV === 'development';
    const urlParams = new URLSearchParams(window.location.search);
    const debugMode = urlParams.get('debug') === 'true';
    
    setIsVisible(isDev || debugMode);

    // Проверяем наличие куков
    const checkCookies = () => {
      setCookieStatus({
        twitch_access_token: hasCookie('twitch_access_token'),
        twitch_refresh_token: hasCookie('twitch_refresh_token'),
        twitch_user: hasCookie('twitch_user'),
        twitch_state: hasCookie('twitch_state')
      });
      
      // Выводим информацию в консоль для отладки
      console.log('Статус куков:', {
        twitch_access_token: hasCookie('twitch_access_token'),
        twitch_refresh_token: hasCookie('twitch_refresh_token'),
        twitch_user: hasCookie('twitch_user'),
        twitch_state: hasCookie('twitch_state')
      });
    };

    // Проверяем куки при загрузке компонента
    checkCookies();

    // Проверяем куки каждые 5 секунд
    const interval = setInterval(checkCookies, 5000);

    // Очищаем интервал при размонтировании компонента
    return () => clearInterval(interval);
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
      zIndex: 9999
    }}>
      <h4 style={{ margin: '0 0 5px 0' }}>Статус куков:</h4>
      <ul style={{ margin: 0, padding: '0 0 0 20px' }}>
        {Object.entries(cookieStatus).map(([name, exists]) => (
          <li key={name} style={{ color: exists ? 'lightgreen' : 'red' }}>
            {name}: {exists ? 'Есть' : 'Нет'}
          </li>
        ))}
      </ul>
    </div>
  );
} 