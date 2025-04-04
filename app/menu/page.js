'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
// import Link from 'next/link'; // Удаляем неиспользуемый импорт
import Image from 'next/image';
import styles from '../../styles/menu.module.css';
import { useAuth } from '../../contexts/AuthContext';
import clientStorage from '../utils/clientStorage';
import Cookies from 'js-cookie';
import { DataStorage } from '../utils/dataStorage';
import { checkAdminAccess } from '../utils/adminUtils'; // Добавляем импорт для проверки прав администратора

// Безопасные функции для работы с локальным хранилищем
const safeGetFromStorage = (key) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem(key);
  }
  return null;
};

const safeSetToStorage = (key, value) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(key, value);
  }
};

export default function Menu() {
  const router = useRouter();
  const { userId, userLogin, userAvatar, setUserLogin, setUserAvatar } = useAuth();
  
  const [streamCoins, setStreamCoins] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false); // Добавляем состояние для проверки прав администратора
  const [adminRole, setAdminRole] = useState(null); // Добавляем состояние для хранения роли администратора
  const hasRedirectedRef = useRef(false);
  
  // Выносим функции за пределы useEffect для оптимизации
  const loadStreamCoins = useCallback((userId) => {
    try {
      if (!userId) {
        console.error('Ошибка при загрузке стример-коинов: userId не определен');
        setStreamCoins(100); // Устанавливаем значение по умолчанию
        return;
      }
      
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
    const idPart = userId.substring(0, 6) || '000000';
    return `SU-${idPart}`;
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
        let userData = null;
        let userDataStr = null;
        
        // Сначала проверяем localStorage
        const lsUserData = clientStorage.getItem('twitch_user');
        if (lsUserData) {
          console.log('Найдены данные пользователя в localStorage');
          userDataStr = lsUserData;
        }
        
        // Затем проверяем куки
        if (!userDataStr) {
          const cookieUserData = Cookies.get('twitch_user_data') || Cookies.get('twitch_user');
          if (cookieUserData) {
            console.log('Найдены данные пользователя в куках');
            userDataStr = cookieUserData;
          }
        }
        
        // Если у нас есть данные пользователя в localStorage, устанавливаем куку
        // для уведомления middleware о наличии данных
        if (clientStorage.getItem('twitch_user')) {
          Cookies.set('has_local_storage_token', 'true', { 
            expires: 1, // 1 день
            path: '/',
            sameSite: 'lax'
          });
          console.log('Установлена кука has_local_storage_token для middleware');
        }
        
        // Если данных нет, но мы не с авторизации - перенаправляем
        if (!userDataStr && !hasRedirectedRef.current) {
          if (!cameFromAuth) {
            console.log('Данные пользователя не найдены, перенаправляем на страницу авторизации');
            hasRedirectedRef.current = true;
            clientStorage.setItem('menu_to_auth_redirect', 'true');
            router.push('/auth');
            return;
          } else {
            setError('Произошла ошибка при получении данных пользователя. Пожалуйста, попробуйте войти снова.');
            setIsLoading(false);
            return;
          }
        }
        
        // Получаем userId и обновляем состояние пользователя
        let userIdToUse = userId;
        let userLoginToUse = userLogin;
        let userAvatarToUse = userAvatar;
        
        if (userDataStr) {
          try {
            userData = typeof userDataStr === 'string' ? JSON.parse(userDataStr) : userDataStr;
            
            console.log('Парсинг данных пользователя в меню:', {
              id: userData.id || userData.twitchId,
              login: userData.login || userData.displayName || userData.display_name || userData.username,
              hasAvatar: !!(userData.avatar || userData.profile_image_url)
            });
            
            userIdToUse = userData.id || userData.twitchId || userIdToUse;
            userLoginToUse = userData.login || userData.displayName || userData.display_name || userData.username || userLoginToUse || 'Пользователь';
            userAvatarToUse = userData.avatar || userData.profile_image_url || userAvatarToUse;
            
            // Всегда обновляем данные в контексте авторизации
            setUserLogin(userLoginToUse);
            
            if (userAvatarToUse) {
              setUserAvatar(userAvatarToUse);
            }
            
            // Сохраняем обновленные данные пользователя в localStorage
            if (userIdToUse) {
              const userDataToStore = {
                id: userIdToUse,
                twitchId: userData.twitchId || userIdToUse,
                username: userLoginToUse,
                displayName: userData.displayName || userData.display_name || userLoginToUse,
                avatar: userAvatarToUse
              };
              
              localStorage.setItem('twitch_user', JSON.stringify(userDataToStore));
              localStorage.setItem('is_authenticated', 'true');
              
              // Устанавливаем куку для middleware
              Cookies.set('has_local_storage_token', 'true', { 
                expires: 1, // 1 день
                path: '/',
                sameSite: 'lax'
              });
              
              // Дублируем данные в куку для доступа на стороне клиента
              Cookies.set('twitch_user_data', JSON.stringify(userDataToStore), {
                expires: 7, // 7 дней
                path: '/',
                sameSite: 'lax'
              });
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
          loadStreamCoins(userIdToUse);
          
          // Проверяем права администратора
          const adminAccess = await checkAdminAccess();
          setIsAdmin(adminAccess.isAdmin);
          setAdminRole(adminAccess.role);
          console.log('Проверка прав администратора:', adminAccess);
        } else {
          console.error('Не удалось получить userId');
          setError('Не удалось получить данные пользователя. Пожалуйста, попробуйте войти снова.');
          setIsLoading(false);
          return;
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
            } else if (coinsData && coinsData.balance !== undefined) {
              coinsBalance = coinsData.balance;
              break;
            }
          }
        }
        
        console.log('Баланс монет в меню:', coinsBalance);
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
    
  }, [userId, userLogin, userAvatar, loadStreamCoins, generateReferralCode, router, setUserLogin, setUserAvatar]);
  
  // Функция для перехода на страницу профиля
  const goToProfile = (e) => {
    if (e) {
      e.preventDefault();
    }
    router.push('/profile');
  };
  
  // Функция для перехода на страницу коинов
  const goToCoinsPage = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    router.push('/coins');
  };
  
  // Функция для перехода в админ-панель
  const goToAdminPanel = (e) => {
    if (e) {
      e.preventDefault();
    }
    router.push('/admin');
  };
  
  // Если идет загрузка, показываем индикатор
  if (isLoading) {
    return (
      <div className={styles.loading || styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Загрузка меню...</p>
      </div>
    );
  }
  
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
            {userAvatar ? (
              <div className={styles.userAvatar} onClick={goToProfile} title="Перейти в профиль">
                <Image 
                  src={userAvatar}
                  alt="User Avatar"
                  className={styles.avatar}
                  width={80}
                  height={80}
                  priority
                />
              </div>
            ) : (
              <div className={styles.userAvatarPlaceholder} onClick={goToProfile} title="Перейти в профиль">
                <span>{(userLogin || 'П')[0].toUpperCase()}</span>
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
              {isAdmin && (
                <div className={styles.adminBadge} onClick={goToAdminPanel} title="Перейти в админ-панель">
                  <span className={styles.badgeIcon}>⚙️</span>
                  <span className={styles.badgeText}>Администратор {adminRole && `(${adminRole})`}</span>
                </div>
              )}
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
          
          {isAdmin && (
            <div 
              className={`${styles.menuItem} ${styles.adminMenuItem}`}
              onClick={goToAdminPanel}
            >
              <div className={styles.menuIcon}>👑</div>
              <div className={styles.menuContent}>
                <h2>Админ-панель</h2>
                <p>Перейти в панель управления для администраторов</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 