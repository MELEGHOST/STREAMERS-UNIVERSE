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
  
  const [streamCoins, setStreamCoins] = useState(100);
  const [referralCode, setReferralCode] = useState('');
  
  useEffect(() => {
    if (isAuthenticated && userId) {
      // Загружаем стример-коины
      loadStreamCoins(userId);
      
      // Генерируем реферальный код
      setReferralCode(generateReferralCode(userId));
    } else {
      // Если пользователь не авторизован через контекст, пробуем получить данные из localStorage или cookies
      try {
        const twitchUserData = localStorage.getItem('twitch_user') || Cookies.get('twitch_user');
        if (twitchUserData) {
          const userData = JSON.parse(twitchUserData);
          if (userData && userData.id) {
            loadStreamCoins(userData.id);
            setReferralCode(generateReferralCode(userData.id));
          }
        }
      } catch (error) {
        console.error('Ошибка при получении данных пользователя:', error);
      }
    }
  }, [isAuthenticated, userId]);
  
  // Загрузка стример-коинов из localStorage
  const loadStreamCoins = (userId) => {
    try {
      if (!userId) {
        console.error('Ошибка при загрузке стример-коинов: userId не определен');
        setStreamCoins(100); // Устанавливаем значение по умолчанию
        return;
      }
      
      const storedCoins = localStorage.getItem(`streamcoins_${userId}`);
      console.log(`Загрузка стример-коинов для пользователя ${userId}:`, storedCoins);
      
      if (storedCoins && !isNaN(parseInt(storedCoins, 10))) {
        setStreamCoins(parseInt(storedCoins, 10));
      } else {
        // Если стример-коинов нет или значение некорректно, устанавливаем начальное значение
        localStorage.setItem(`streamcoins_${userId}`, '100');
        setStreamCoins(100);
      }
    } catch (error) {
      console.error('Ошибка при загрузке стример-коинов:', error);
      setStreamCoins(100); // Устанавливаем значение по умолчанию при ошибке
    }
  };
  
  // Генерация реферального кода
  const generateReferralCode = (userId) => {
    if (!userId) return 'SU-000000';
    return `SU-${userId.substring(0, 6)}`;
  };
  
  // Переход в профиль пользователя
  const goToProfile = () => {
    router.push('/profile');
  };
  
  return (
    <div className={styles.container}>
      <Head>
        <title>Меню | Streamers Universe</title>
        <meta name="description" content="Главное меню Streamers Universe" />
      </Head>
      
      <div className={styles.menuContainer}>
        <div className={styles.menuHeader}>
          <div className={styles.userInfo}>
            {userAvatar && (
              <div className={styles.userAvatar} onClick={goToProfile} title="Перейти в профиль">
                <img src={userAvatar} alt={userLogin} />
              </div>
            )}
            <div className={styles.userDetails}>
              <h1>Привет, {userLogin}!</h1>
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
      </div>
    </div>
  );
}