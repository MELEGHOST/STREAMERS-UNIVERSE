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
    const checkUserAuthentication = () => {
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
        
        // Пробуем получить данные из API
        fetch('/api/twitch/user', {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
        .then(response => {
          if (response.ok) {
            return response.json();
          }
          throw new Error('Failed to fetch user data');
        })
        .then(data => {
          if (data && data.id) {
            console.log('Пользователь получен из API:', data.login);
            setUserData(data);
            localStorage.setItem('twitch_user', JSON.stringify(data));
            localStorage.setItem('is_authenticated', 'true');
          } else {
            console.log('Данные пользователя не получены из API');
            setUserData(null);
          }
        })
        .catch(error => {
          console.error('Ошибка при получении данных пользователя:', error);
          setUserData(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
      } catch (error) {
        console.error('Глобальная ошибка при проверке аутентификации:', error);
        setIsLoading(false);
        setUserData(null);
      }
    };
    
    checkUserAuthentication();
  }, []);
  
  // Переход на страницу профиля
  const goToProfile = () => {
    router.push('/profile');
  };
  
  // Текст приветствия в зависимости от наличия данных пользователя
  const greetingText = userData ? `Привет, ${userData.display_name || userData.login}!` : 'Привет, Гость!';
  
  return (
    <div className={styles.header}>
      <div className={styles.userInfoContainer}>
        {userData && userData.profile_image_url && (
          <div className={styles.avatarContainer} onClick={goToProfile}>
            <img 
              src={userData.profile_image_url} 
              alt={userData.display_name || userData.login} 
              className={styles.avatarImage}
            />
          </div>
        )}
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