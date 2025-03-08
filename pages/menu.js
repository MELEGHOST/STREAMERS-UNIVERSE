import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Cookies from 'js-cookie';
import styles from '../styles/menu.module.css';
import { useAuth } from '../contexts/AuthContext';

export default function Menu() {
  const router = useRouter();
  const { isAuthenticated, userId, userLogin, userAvatar, logout } = useAuth();
  
  const [streamCoins, setStreamCoins] = useState(0);
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Проверяем авторизацию через Twitch
    const checkTwitchAuth = async () => {
      try {
        // Проверяем наличие токена в cookies или localStorage
        const twitchAccessToken = Cookies.get('twitch_access_token') || localStorage.getItem('cookie_twitch_access_token');
        const twitchUser = Cookies.get('twitch_user') || localStorage.getItem('cookie_twitch_user') || localStorage.getItem('twitch_user');
        
        console.log('Проверка авторизации Twitch:', { 
          hasTwitchAccessToken: !!twitchAccessToken, 
          hasTwitchUser: !!twitchUser 
        });
        
        if (twitchAccessToken && twitchUser) {
          // Пользователь уже авторизован через Twitch
          setLoading(false);
        } else {
          // Если нет авторизации через Twitch, перенаправляем на страницу авторизации
          console.log('Нет авторизации через Twitch, перенаправление на /auth');
          router.push('/auth');
        }
      } catch (error) {
        console.error('Ошибка при проверке авторизации Twitch:', error);
        setLoading(false);
      }
    };
    
    checkTwitchAuth();
  }, [router]);
  
  useEffect(() => {
    if (isAuthenticated && userId) {
      // Загружаем стример-коины
      loadStreamCoins(userId);
      
      // Генерируем реферальный код
      setReferralCode(generateReferralCode(userId));
    }
  }, [isAuthenticated, userId]);
  
  // Загрузка стример-коинов из localStorage
  const loadStreamCoins = (userId) => {
    try {
      const storedCoins = localStorage.getItem(`streamcoins_${userId}`);
      if (storedCoins) {
        setStreamCoins(parseInt(storedCoins, 10));
      } else {
        // Если стример-коинов нет, устанавливаем начальное значение
        localStorage.setItem(`streamcoins_${userId}`, '100');
        setStreamCoins(100);
      }
    } catch (error) {
      console.error('Ошибка при загрузке стример-коинов:', error);
    }
  };
  
  // Генерация реферального кода
  const generateReferralCode = (userId) => {
    return `SU-${userId.substring(0, 6)}`;
  };
  
  // Обработка выхода из системы
  const handleLogout = () => {
    logout();
    router.push('/auth');
  };
  
  // Показываем индикатор загрузки, пока проверяем авторизацию
  if (loading) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Загрузка... | Streamers Universe</title>
        </Head>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }
  
  // Если пользователь не авторизован через контекст, но у нас есть токен Twitch,
  // мы все равно показываем меню, так как авторизация через Twitch уже выполнена
  const twitchAccessToken = Cookies.get('twitch_access_token') || localStorage.getItem('cookie_twitch_access_token');
  const twitchUser = Cookies.get('twitch_user') || localStorage.getItem('cookie_twitch_user') || localStorage.getItem('twitch_user');
  
  if (!isAuthenticated && !twitchAccessToken && !twitchUser) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Меню | Streamers Universe</title>
        </Head>
        <div className={styles.authMessage}>
          <h2>Требуется авторизация</h2>
          <p>Пожалуйста, войдите в систему, чтобы получить доступ к меню.</p>
          <button onClick={() => router.push('/auth')} className={styles.authButton}>
            Войти
          </button>
        </div>
      </div>
    );
  }
  
  // Пытаемся получить данные пользователя из Twitch, если они не доступны через контекст
  let displayName = userLogin;
  let avatarUrl = userAvatar;
  
  if (!displayName || !avatarUrl) {
    try {
      const twitchUserData = twitchUser ? (typeof twitchUser === 'string' ? JSON.parse(twitchUser) : twitchUser) : null;
      if (twitchUserData) {
        displayName = displayName || twitchUserData.login || twitchUserData.display_name;
        avatarUrl = avatarUrl || twitchUserData.profile_image_url;
      }
    } catch (error) {
      console.error('Ошибка при парсинге данных пользователя Twitch:', error);
    }
  }
  
  return (
    <div className={styles.container}>
      <Head>
        <title>Меню | Streamers Universe</title>
        <meta name="description" content="Главное меню Streamers Universe" />
      </Head>
      
      <div className={styles.menuContainer}>
        <div className={styles.menuHeader}>
          <div className={styles.userInfo}>
            {avatarUrl && (
              <div className={styles.userAvatar}>
                <img src={avatarUrl} alt={displayName || 'Пользователь'} />
              </div>
            )}
            <div className={styles.userDetails}>
              <h1>Привет, {displayName || 'Пользователь'}!</h1>
              <div className={styles.coinsContainer}>
                <div className={styles.coinIcon}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z" />
                  </svg>
                </div>
                <span className={styles.coinsAmount}>{streamCoins}</span>
              </div>
            </div>
          </div>
          <p className={styles.menuSubtitle}>Выберите раздел, чтобы продолжить</p>
        </div>
        
        <div className={styles.menuItems}>
          <div 
            className={styles.menuItem}
            onClick={() => router.push('/search')}
          >
            <div className={styles.menuIcon}>🔍</div>
            <div className={styles.menuContent}>
              <h2>1. Поиск</h2>
              <p>Найти другого пользователя по никнейму с Twitch, проверить зарегистрирован ли он, сколько у него фолловеров, на каких общих стримеров вы подписаны</p>
            </div>
          </div>
          
          <div 
            className={styles.menuItem}
            onClick={() => router.push('/followings')}
          >
            <div className={styles.menuIcon}>📋</div>
            <div className={styles.menuContent}>
              <h2>2. Фолловинги Twitch</h2>
              <p>Посмотреть на каких стримеров вы подписаны на Twitch (фолловите)</p>
            </div>
          </div>
          
          <div 
            className={styles.menuItem}
            onClick={() => router.push('/followers')}
          >
            <div className={styles.menuIcon}>👥</div>
            <div className={styles.menuContent}>
              <h2>3. Фолловеры Twitch</h2>
              <p>Посмотреть кто подписан на вас на Twitch (фолловеры)</p>
            </div>
          </div>
          
          <div 
            className={styles.menuItem}
            onClick={() => router.push('/questions')}
          >
            <div className={styles.menuIcon}>❓</div>
            <div className={styles.menuContent}>
              <h2>4. Вопросы</h2>
              <p>Задавайте вопросы другим пользователям и отвечайте на вопросы, адресованные вам</p>
            </div>
          </div>
          
          <div 
            className={styles.menuItem}
            onClick={() => router.push('/settings')}
          >
            <div className={styles.menuIcon}>⚙️</div>
            <div className={styles.menuContent}>
              <h2>5. Настройки</h2>
              <p>Возможность сменить тему (тёмная/светлая), поменять шрифт, часовой пояс, язык и другие настройки</p>
            </div>
          </div>
        </div>
        
        <button className={styles.logoutButton} onClick={handleLogout}>
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
} 