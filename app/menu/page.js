'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../../styles/menu.module.css';
import { useAuth } from '../../contexts/AuthContext';
import clientStorage from '../utils/clientStorage';

export default function Menu() {
  const router = useRouter();
  const { isAuthenticated, userId, userLogin, userAvatar } = useAuth();
  
  const [streamCoins, setStreamCoins] = useState(100);
  const [referralCode, setReferralCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasRedirectedRef = useRef(false);
  
  // Выносим функции за пределы useEffect для оптимизации
  const loadStreamCoins = useCallback((userId) => {
    try {
      if (!userId) {
        console.error('Ошибка при загрузке стример-коинов: userId не определен');
        setStreamCoins(100); // Устанавливаем значение по умолчанию
        return;
      }
      
      // Безопасное получение данных из localStorage
      const safeGetFromStorage = (key) => {
        if (typeof window !== 'undefined' && window.localStorage) {
          return localStorage.getItem(key);
        }
        return null;
      };
      
      // Безопасное сохранение данных в localStorage
      const safeSetToStorage = (key, value) => {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(key, value);
        }
      };
      
      const storedCoins = safeGetFromStorage(`streamcoins_${userId}`);
      
      if (storedCoins && !isNaN(parseInt(storedCoins, 10))) {
        setStreamCoins(parseInt(storedCoins, 10));
      } else {
        // Если стример-коинов нет или значение некорректно, устанавливаем начальное значение
        safeSetToStorage(`streamcoins_${userId}`, '100');
        setStreamCoins(100);
      }
    } catch (error) {
      console.error('Ошибка при загрузке стример-коинов:', error);
      setStreamCoins(100); // Устанавливаем значение по умолчанию при ошибке
    }
  }, []);
  
  const generateReferralCode = useCallback((userId) => {
    if (!userId) return 'SU-000000';
    return `SU-${userId.substring(0, 6)}`;
  }, []);
  
  // Проверка авторизации и загрузка данных
  useEffect(() => {
    // Сбрасываем флаг ошибки при загрузке
    setError(null);
    
    // Функция для асинхронной инициализации пользователя
    const initUser = async () => {
      try {
        // Проверяем, пришли ли мы с авторизации
        const cameFromAuth = clientStorage.getItem('auth_to_menu_redirect');
        if (cameFromAuth) {
          clientStorage.removeItem('auth_to_menu_redirect');
        }
        
        // Получаем данные пользователя
        const userData = clientStorage.getItem('twitch_user') || 
                      clientStorage.getItem('cookie_twitch_user');
        
        // Если данных нет, но мы не с авторизации - перенаправляем
        if (!userData && !hasRedirectedRef.current) {
          if (!cameFromAuth) {
            console.log('Данные пользователя не найдены, перенаправляем на страницу авторизации');
            hasRedirectedRef.current = true;
            clientStorage.setItem('menu_to_auth_redirect', 'true');
            router.push('/auth');
            return;
          } else {
            setError('Произошла ошибка при получении данных пользователя. Пожалуйста, попробуйте войти снова.');
            return;
          }
        }
        
        // Получаем userId
        let userIdToUse = userId;
        if (!userIdToUse && userData) {
          try {
            const parsedData = typeof userData === 'string' ? JSON.parse(userData) : userData;
            userIdToUse = parsedData.id;
          } catch (e) {
            console.error('Ошибка при получении userId из localStorage:', e);
          }
        }
        
        if (userIdToUse) {
          // Загружаем стример-коины
          try {
            const storedCoins = clientStorage.getItem(`streamcoins_${userIdToUse}`);
            if (storedCoins && !isNaN(parseInt(storedCoins, 10))) {
              setStreamCoins(parseInt(storedCoins, 10));
            } else {
              clientStorage.setItem(`streamcoins_${userIdToUse}`, '100');
              setStreamCoins(100);
            }
          } catch (e) {
            console.error('Ошибка при загрузке стример-коинов:', e);
            setStreamCoins(100);
          }
          
          // Генерируем реферальный код
          setReferralCode(`SU-${userIdToUse.substring(0, 6) || '000000'}`);
        } else {
          console.error('Не удалось получить userId');
          setError('Не удалось получить данные пользователя. Пожалуйста, попробуйте войти снова.');
        }
      } catch (error) {
        console.error('Ошибка при инициализации пользователя:', error);
        setError('Произошла ошибка при загрузке данных. Пожалуйста, обновите страницу.');
      } finally {
        // В любом случае скрываем индикатор загрузки
        setIsLoading(false);
      }
    };
    
    // Начинаем инициализацию сразу
    initUser();
    
  }, [isAuthenticated, userId, router]);
  
  // При переходе на страницу профиля не показываем индикатор загрузки
  const goToProfile = () => {
    router.push('/profile');
  };
  
  // Если есть ошибка, показываем сообщение об ошибке
  if (error) {
    return (
      <div className={styles.error}>
        <h2>Ошибка загрузки</h2>
        <p>{error}</p>
        <div className={styles.buttonContainer}>
          <button 
            className={styles.button}
            onClick={() => window.location.reload()}
          >
            Обновить страницу
          </button>
          <button 
            className={styles.button}
            onClick={() => router.push('/auth')}
          >
            Вернуться на страницу авторизации
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className={styles.container}>
      <div className={styles.menuContainer}>
        <div className={styles.menuHeader}>
          <div className={styles.userInfo}>
            {userAvatar && (
              <div className={styles.userAvatar} onClick={goToProfile} title="Перейти в профиль">
                <img src={userAvatar} alt={userLogin || 'Пользователь'} />
              </div>
            )}
            <div className={styles.userDetails}>
              <h1>Привет, {userLogin || 'Гость'}!</h1>
              <div className={styles.coinsContainer}>
                <div className={styles.coinIcon}>
                  <Image 
                    src="/images/stream-coin.svg" 
                    alt="Stream Coins" 
                    width={24} 
                    height={24} 
                    priority
                  />
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
              <h2>3. Последователи</h2>
              <p>Посмотреть кто подписан на вас на Twitch (фолловеры) и на Streamers Universe (последователи)</p>
            </div>
          </div>
          
          <div 
            className={styles.menuItem}
            onClick={() => router.push('/reviews')}
          >
            <div className={styles.menuIcon}>⭐</div>
            <div className={styles.menuContent}>
              <h2>4. Отзывы</h2>
              <p>Отзывы стримеров о товарах и сервисах: периферия, компьютеры, аксессуары и многое другое</p>
            </div>
          </div>
          
          <div 
            className={styles.menuItem}
            onClick={() => router.push('/questions')}
          >
            <div className={styles.menuIcon}>❓</div>
            <div className={styles.menuContent}>
              <h2>5. Вопросы</h2>
              <p>Задавайте вопросы другим пользователям и отвечайте на вопросы, адресованные вам</p>
            </div>
          </div>
          
          <div 
            className={styles.menuItem}
            onClick={() => router.push('/coins')}
          >
            <div className={styles.menuIcon}>💰</div>
            <div className={styles.menuContent}>
              <h2>6. Стример-коины</h2>
              <p>Получайте ежедневный бонус в 100 стример-коинов для альфа-тестеров и следите за своими транзакциями</p>
            </div>
          </div>
          
          <div 
            className={styles.menuItem}
            onClick={() => router.push('/settings')}
          >
            <div className={styles.menuIcon}>⚙️</div>
            <div className={styles.menuContent}>
              <h2>7. Настройки</h2>
              <p>Возможность сменить тему (тёмная/светлая), поменять шрифт, часовой пояс, язык и другие настройки</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 