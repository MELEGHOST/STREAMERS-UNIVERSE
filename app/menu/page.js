'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../../styles/menu.module.css';
import { useAuth } from '../../contexts/AuthContext';
import clientStorage from '../utils/clientStorage';
import Cookies from 'js-cookie';
import { DataStorage } from '../utils/dataStorage';

export default function Menu() {
  const router = useRouter();
  const { isAuthenticated, userId, userLogin, userAvatar, isInitialized, setUserLogin, setUserAvatar } = useAuth();
  
  const [streamCoins, setStreamCoins] = useState(100);
  const [referralCode, setReferralCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasRedirectedRef = useRef(false);
  const [balance, setBalance] = useState(0);
  
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
      
      // Проверяем как новый формат данных о коинах, так и старый
      const coinsDataKey = `data_streamcoins_${userId}`;
      const oldCoinsKey = `streamcoins_${userId}`;
      
      // Сначала проверяем новый формат
      const storedCoinsData = safeGetFromStorage(coinsDataKey);
      if (storedCoinsData) {
        try {
          const parsedData = JSON.parse(storedCoinsData);
          if (parsedData && typeof parsedData.balance === 'number') {
            setStreamCoins(parsedData.balance);
            
            // Синхронизируем со старым форматом для совместимости
            safeSetToStorage(oldCoinsKey, parsedData.balance.toString());
            return;
          }
        } catch (e) {
          console.warn('Ошибка при парсинге данных о коинах из нового формата:', e);
        }
      }
      
      // Если новый формат не найден, проверяем старый
      const storedCoins = safeGetFromStorage(oldCoinsKey);
      if (storedCoins && !isNaN(parseInt(storedCoins, 10))) {
        const coinsValue = parseInt(storedCoins, 10);
        setStreamCoins(coinsValue);
        
        // Создаем новый формат данных
        const newFormatData = {
          balance: coinsValue,
          lastUpdated: new Date().toISOString(),
          transactions: []
        };
        safeSetToStorage(coinsDataKey, JSON.stringify(newFormatData));
      } else {
        // Если стример-коинов нет или значение некорректно, устанавливаем начальное значение
        safeSetToStorage(oldCoinsKey, '100');
        
        // Создаем новый формат данных
        const newFormatData = {
          balance: 100,
          lastUpdated: new Date().toISOString(),
          transactions: []
        };
        safeSetToStorage(coinsDataKey, JSON.stringify(newFormatData));
        
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
        
        // Получаем данные пользователя из всех возможных источников
        const userData = 
                      clientStorage.getItem('twitch_user') || 
                      clientStorage.getItem('cookie_twitch_user') ||
                      Cookies.get('twitch_user') ||
                      Cookies.get('twitch_user_data');
        
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
        
        // Получаем userId и обновляем состояние пользователя
        let userIdToUse = userId;
        let userLoginToUse = userLogin;
        let userAvatarToUse = userAvatar;
        
        if (userData) {
          try {
            const parsedData = typeof userData === 'string' ? JSON.parse(userData) : userData;
            userIdToUse = parsedData.id || parsedData.twitchId;
            userLoginToUse = parsedData.login || parsedData.displayName || parsedData.username;
            userAvatarToUse = parsedData.profile_image_url || parsedData.avatar;
            
            // Устанавливаем состояние пользователя
            if (userLoginToUse && !userLogin) {
              setUserLogin(userLoginToUse);
            }
            
            if (userAvatarToUse && !userAvatar) {
              setUserAvatar(userAvatarToUse);
            }
          } catch (e) {
            console.error('Ошибка при получении данных пользователя из хранилища:', e);
          }
        }

        if (userIdToUse) {
          // Логируем данные пользователя для отладки
          console.log('Данные пользователя:', {
            id: userIdToUse,
            login: userLoginToUse,
            avatar: userAvatarToUse ? userAvatarToUse.substring(0, 30) + '...' : 'не найдено'
          });
          
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

        // Получаем актуальный баланс монет из хранилища
        const coinsKeys = [
          `streamcoins_${userIdToUse}`,
          `data_streamcoins_${userIdToUse}`
        ];
        
        let coinsBalance = 0;
        
        // Ищем данные о монетах в всех возможных местах
        for (const key of coinsKeys) {
          const coinsData = DataStorage.getData(key);
          if (coinsData) {
            // Проверяем формат данных
            if (typeof coinsData === 'string') {
              coinsBalance = parseInt(coinsData, 10) || 0;
              break;
            } else if (coinsData.balance !== undefined) {
              coinsBalance = coinsData.balance;
              break;
            }
          }
        }
        
        console.log('Баланс монет в меню:', coinsBalance);
        setBalance(coinsBalance);
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
    
  }, [isAuthenticated, userId, router, userLogin, userAvatar, setUserLogin, setUserAvatar]);
  
  // Функция для перехода на страницу профиля
  const goToProfile = (e) => {
    e.preventDefault();
    
    // Проверяем наличие флага авторизации в localStorage
    const isAuthenticatedInStorage = localStorage.getItem('is_authenticated') === 'true';
    
    // Проверяем наличие userId в localStorage
    let userIdFromStorage = null;
    try {
      const storedUserData = localStorage.getItem('twitch_user');
      if (storedUserData) {
        const userData = JSON.parse(storedUserData);
        userIdFromStorage = userData?.id;
      }
    } catch (error) {
      console.error('Ошибка при получении userId из localStorage:', error);
    }
    
    // Если в localStorage есть флаг авторизации и userId, сразу переходим на профиль
    if (isAuthenticatedInStorage && userIdFromStorage) {
      console.log("Переход на профиль напрямую из localStorage. userId:", userIdFromStorage);
      router.push('/profile');
      return;
    }
    
    // Проверяем инициализацию и статус авторизации
    if (!isInitialized) {
      console.log("AuthContext еще инициализируется, пожалуйста, подождите...");
      // Показываем индикатор загрузки или сообщение
      setIsLoading(true);
      // Через некоторое время проверяем снова
      setTimeout(() => {
        setIsLoading(false);
        
        // Повторно проверяем флаг в localStorage
        const isAuthenticatedInStorageRetry = localStorage.getItem('is_authenticated') === 'true';
        
        if (userId || isAuthenticatedInStorageRetry) {
          router.push('/profile');
        } else {
          console.error("Не удалось определить userId для перехода на профиль");
          alert("Не удалось определить ваш ID. Пожалуйста, попробуйте войти снова.");
          localStorage.setItem('auth_redirect', '/menu');
          router.push('/auth');
        }
      }, 1500);
      return;
    }
    
    if (userId || isAuthenticatedInStorage) {
      console.log("Переход на профиль. userId:", userId || "из localStorage");
      router.push('/profile');
    } else {
      console.error("Не удалось определить userId для перехода на профиль");
      alert("Не удалось определить ваш ID. Пожалуйста, попробуйте войти снова.");
      localStorage.setItem('auth_redirect', '/menu');
      router.push('/auth');
    }
  };
  
  // Функция для перехода на страницу коинов
  const goToCoinsPage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (userId) {
      console.log("Переход на страницу коинов. userId:", userId);
      router.push('/coins');
    } else {
      console.error("Не удалось определить userId для перехода на страницу коинов");
      alert("Не удалось определить ваш ID. Пожалуйста, попробуйте войти снова.");
      router.push('/auth');
    }
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
              <div className={styles.coinsContainer} onClick={goToCoinsPage} title="Перейти к Стример-коинам">
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
              <h2>2. Вдохновители</h2>
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
              <p>Посмотреть кто подписан на вас на Streamers Universe (последователи) и ваши достижения в сообществе</p>
            </div>
          </div>
          
          <div 
            className={styles.menuItem}
            onClick={() => router.push('/reviews')}
          >
            <div className={styles.menuIcon}>⭐</div>
            <div className={styles.menuContent}>
              <h2>4. Отзывы</h2>
              <p>Отзывы пользователей о товарах, сервисах и других пользователях: периферия, компьютеры, аксессуары и многое другое</p>
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
            onClick={() => router.push('/settings')}
          >
            <div className={styles.menuIcon}>⚙️</div>
            <div className={styles.menuContent}>
              <h2>6. Настройки</h2>
              <p>Возможность сменить тему (тёмная/светлая), поменять шрифт, часовой пояс, язык и другие настройки</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 