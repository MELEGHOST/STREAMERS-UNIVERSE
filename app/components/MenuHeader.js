'use client';

import styles from './MenuHeader.module.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import CoinDisplay from './CoinDisplay';

const MenuHeader = () => {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  
  useEffect(() => {
    const checkUserAuthentication = async () => {
      try {
        // Проверяем наличие данных пользователя в localStorage
        const storedUser = localStorage.getItem('twitch_user');
        const isAuthenticated = localStorage.getItem('is_authenticated') === 'true';
        
        if (storedUser && isAuthenticated) {
          try {
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser && parsedUser.id) {
              console.log('Пользователь найден в локальном хранилище:', parsedUser.login);
              setUserData(parsedUser);
              setIsLoading(false);
              return;
            }
          } catch (e) {
            console.error('Ошибка при парсинге данных пользователя:', e);
          }
        }
        
        // Получаем ID пользователя из токена
        const token = localStorage.getItem('twitch_access_token') || document.cookie.match(/twitch_access_token=([^;]+)/)?.[1];
        if (!token) {
          console.log('Токен Twitch не найден, перенаправляем на страницу авторизации');
          setIsLoading(false);
          router.push('/auth');
          return;
        }
        
        // Пробуем получить данные из API
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.valid && data.user) {
            console.log('Пользователь верифицирован через API:', data.user.name || data.user.login);
            setUserData(data.user);
            localStorage.setItem('twitch_user', JSON.stringify(data.user));
            localStorage.setItem('is_authenticated', 'true');
          } else {
            console.log('Верификация не прошла, перенаправляем на страницу авторизации');
            setIsLoading(false);
            router.push('/auth');
          }
        } else {
          console.error('Ошибка при верификации пользователя');
          setIsLoading(false);
          router.push('/auth');
        }
      } catch (error) {
        console.error('Глобальная ошибка при проверке аутентификации:', error);
        setIsLoading(false);
        router.push('/auth');
      }
    };
    
    checkUserAuthentication();
  }, [router]);
  
  // Переход на страницу профиля
  const goToProfile = () => {
    router.push('/profile');
  };
  
  // Текст приветствия в зависимости от наличия данных пользователя
  const greetingText = userData ? `Привет, ${userData.display_name || userData.name || userData.login}!` : 'Загрузка...';
  
  return (
    <div className={styles.header}>
      <div className={styles.userInfoContainer}>
        <div className={styles.avatarContainer} onClick={goToProfile}>
          <img 
            src={userData?.profile_image_url || "https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517fe-def4-11e9-948e-784f43822e80-profile_image-300x300.png"} 
            alt={userData ? (userData.display_name || userData.name || userData.login) : "Загрузка..."} 
            className={styles.avatarImage}
          />
        </div>
        <div className={styles.userTextInfo}>
          <h1 className={styles.greeting}>{isLoading ? 'Загрузка...' : greetingText}</h1>
          {userData ? (
            <CoinDisplay userId={userData.id} />
          ) : (
            <div className={styles.guestCoinContainer}>
              <div className={styles.coinIcon}>S</div>
              <span className={styles.coinAmount}>100</span>
            </div>
          )}
        </div>
      </div>
      <div className={styles.menuText}>
        Выберите раздел, чтобы продолжить
      </div>
    </div>
  );
};

export default MenuHeader; 