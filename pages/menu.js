import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import styles from './menu.module.css';
import Link from 'next/link';

export default function Menu() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [isStreamer, setIsStreamer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [streamCoins, setStreamCoins] = useState(0);

  useEffect(() => {
    // Проверяем авторизацию
    try {
      // Получаем токен доступа из куки или localStorage
      const accessToken = Cookies.get('twitch_access_token') || localStorage.getItem('cookie_twitch_access_token');
      if (!accessToken) {
        console.log('Токен доступа отсутствует, перенаправление на страницу авторизации');
        router.push('/auth');
        return;
      }

      // Получаем данные пользователя из куки или localStorage
      let userDataObj = null;
      
      // Проверяем куки
      const userCookie = Cookies.get('twitch_user');
      if (userCookie) {
        try {
          userDataObj = JSON.parse(userCookie);
          console.log('Данные пользователя получены из куки');
        } catch (e) {
          console.error('Ошибка при парсинге данных пользователя из куки:', e);
        }
      }
      
      // Если нет в куках, проверяем localStorage
      if (!userDataObj) {
        const userLocalStorage = localStorage.getItem('twitch_user') || localStorage.getItem('cookie_twitch_user');
        if (userLocalStorage) {
          try {
            userDataObj = JSON.parse(userLocalStorage);
            console.log('Данные пользователя получены из localStorage');
            
            // Восстанавливаем куку
            if (userDataObj) {
              Cookies.set('twitch_user', JSON.stringify(userDataObj), {
                path: '/',
                secure: window.location.protocol === 'https:',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7 // 7 дней
              });
              console.log('Восстановлена кука с данными пользователя из localStorage');
            }
          } catch (e) {
            console.error('Ошибка при парсинге данных пользователя из localStorage:', e);
          }
        }
      }
      
      if (userDataObj) {
        // Обрабатываем разные форматы данных пользователя
        const displayName = userDataObj.twitchName || userDataObj.display_name;
        const profileImageUrl = userDataObj.profileImageUrl || userDataObj.profile_image_url;
        
        // Устанавливаем данные пользователя
        setUserData({
          ...userDataObj,
          display_name: displayName,
          profileImageUrl: profileImageUrl
        });
        
        setIsStreamer(userDataObj.isStreamer || false);
        
        // Загружаем стример-коины пользователя
        loadStreamCoins(userDataObj.id);
        
        setLoading(false);
      } else {
        // Если данные пользователя не найдены, пробуем получить их из API
        console.log('Данные пользователя не найдены, пробуем получить из API');
        
        fetch('/api/twitch/profile', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        })
        .then(response => {
          if (response.ok) {
            return response.json();
          }
          throw new Error('Не удалось получить данные профиля');
        })
        .then(data => {
          console.log('Данные профиля получены из API:', data);
          
          // Создаем объект с данными пользователя
          const userData = {
            id: data.id,
            login: data.login || data.twitchName.toLowerCase(),
            display_name: data.twitchName,
            profileImageUrl: data.profileImageUrl,
            isStreamer: data.isStreamer
          };
          
          // Сохраняем данные пользователя в localStorage и куки
          localStorage.setItem('twitch_user', JSON.stringify(userData));
          Cookies.set('twitch_user', JSON.stringify(userData), {
            path: '/',
            secure: window.location.protocol === 'https:',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 7 дней
          });
          
          setUserData(userData);
          setIsStreamer(data.isStreamer || false);
          
          // Загружаем стример-коины пользователя
          loadStreamCoins(data.id);
          
          setLoading(false);
        })
        .catch(error => {
          console.error('Ошибка при получении данных профиля:', error);
          setError('Не удалось получить данные профиля. Пожалуйста, попробуйте еще раз.');
          setLoading(false);
        });
      }
    } catch (error) {
      console.error('Ошибка при проверке авторизации:', error);
      setError('Произошла ошибка при проверке авторизации. Пожалуйста, попробуйте еще раз.');
      setLoading(false);
    }
  }, [router]);
  
  // Функция для загрузки стример-коинов пользователя
  const loadStreamCoins = (userId) => {
    try {
      // Проверяем наличие данных о коинах в localStorage
      const coinsData = localStorage.getItem(`streamcoins_${userId}`);
      if (coinsData) {
        try {
          const parsedData = JSON.parse(coinsData);
          setStreamCoins(parsedData.balance || 0);
        } catch (e) {
          console.error('Ошибка при парсинге данных о коинах:', e);
          setStreamCoins(0);
        }
      } else {
        // Если данных нет, устанавливаем начальное значение
        const initialCoins = 100; // Начальное количество коинов для новых пользователей
        setStreamCoins(initialCoins);
        
        // Сохраняем начальные данные в localStorage
        const initialData = {
          userId: userId,
          balance: initialCoins,
          totalEarned: initialCoins,
          totalSpent: 0,
          transactions: [{
            id: `init-${Date.now()}`,
            type: 'earn',
            amount: initialCoins,
            reason: 'initial',
            timestamp: new Date().toISOString(),
            metadata: { note: 'Начальные коины при регистрации' }
          }],
          lastAdWatch: new Date(0).toISOString(),
          referralCode: generateReferralCode(userId),
          referredBy: null
        };
        
        localStorage.setItem(`streamcoins_${userId}`, JSON.stringify(initialData));
      }
    } catch (error) {
      console.error('Ошибка при загрузке стример-коинов:', error);
      setStreamCoins(0);
    }
  };
  
  // Функция для генерации реферального кода
  const generateReferralCode = (userId) => {
    const base = userId.substring(0, 5);
    const randomPart = Math.random().toString(36).substring(2, 6);
    return `${base}-${randomPart}`.toUpperCase();
  };

  const handleMenuItemClick = (path) => {
    try {
      router.push(path);
    } catch (e) {
      console.error('Ошибка при переходе на страницу:', path, e);
      alert(`Ошибка при переходе на страницу ${path}. Пожалуйста, попробуйте еще раз.`);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>{error}</p>
        <button className={styles.button} onClick={() => router.push('/auth')}>
          Вернуться на страницу авторизации
        </button>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className={styles.error}>
        <p>Не удалось загрузить данные пользователя</p>
        <button className={styles.button} onClick={() => router.push('/auth')}>
          Вернуться на страницу авторизации
        </button>
      </div>
    );
  }

  return (
    <div className={styles.menuContainer}>
      <div className={styles.header}>
        <h1>Streamers Universe</h1>
        <div className={styles.userInfo}>
          <img 
            src={userData.profileImageUrl} 
            alt={`${userData.twitchName || userData.display_name} аватар`} 
            className={styles.avatar}
            onClick={() => handleMenuItemClick('/profile')}
            onError={(e) => {
              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%237B41C9"%3E%3C/rect%3E%3Ctext x="100" y="100" font-family="Arial" font-size="24" text-anchor="middle" fill="white"%3ENo Image%3C/text%3E%3C/svg%3E';
            }}
          />
          <div className={styles.userDetails}>
            <span>{userData.twitchName || userData.display_name}</span>
            <div 
              className={styles.coinsContainer}
              onClick={() => handleMenuItemClick('/coins')}
            >
              <img 
                src="/images/stream-coin.svg" 
                alt="Stream Coins" 
                className={styles.coinIcon} 
              />
              <span className={styles.coinsAmount}>{streamCoins}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.menuItems}>
        <Link href="/search" className={styles.menuItem}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          Поиск
        </Link>
        
        <Link href="/messages" className={styles.menuItem}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
          </svg>
          Сообщения
        </Link>
        
        <Link href="/followers" className={styles.menuItem}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
          </svg>
          Фолловеры
        </Link>
        
        <Link href="/followings" className={styles.menuItem}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
          Фолловинги
        </Link>
        
        <Link href="/profile" className={styles.menuItem}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
          Профиль
        </Link>
        
        <Link href="/settings" className={styles.menuItem}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
          </svg>
          Настройки
        </Link>
      </div>
    </div>
  );
} 