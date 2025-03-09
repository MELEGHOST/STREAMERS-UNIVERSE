'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Cookies from 'js-cookie';
import styles from '../../styles/menu.module.css';
import { useAuth } from '../../contexts/AuthContext';
import Head from 'next/head';

export default function Menu() {
  const router = useRouter();
  const { isAuthenticated, userId, userLogin, userAvatar, isInitialized } = useAuth();
  
  const [streamCoins, setStreamCoins] = useState(100);
  const [referralCode, setReferralCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const initTimeoutRef = useRef(null);
  const hasRedirectedRef = useRef(false);
  
  // Выносим функции за пределы useEffect для оптимизации
  const loadStreamCoins = useCallback((userId) => {
    try {
      if (!userId) {
        console.error('Ошибка при загрузке стример-коинов: userId не определен');
        setStreamCoins(100); // Устанавливаем значение по умолчанию
        return;
      }
      
      const storedCoins = localStorage.getItem(`streamcoins_${userId}`);
      
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
  }, []);
  
  const generateReferralCode = useCallback((userId) => {
    if (!userId) return 'SU-000000';
    return `SU-${userId.substring(0, 6)}`;
  }, []);
  
  // Проверка авторизации и загрузка данных
  useEffect(() => {
    // Устанавливаем таймаут для предотвращения бесконечной загрузки
    initTimeoutRef.current = setTimeout(() => {
      if (isLoading) {
        console.warn('Таймаут загрузки меню, принудительно устанавливаем isLoading = false');
        setIsLoading(false);
        setError('Превышено время ожидания загрузки. Пожалуйста, обновите страницу или попробуйте войти снова.');
      }
    }, 5000); // Уменьшаем таймаут до 5 секунд вместо 10
    
    // Логируем состояние для отладки
    console.log('Menu useEffect:', { isInitialized, isAuthenticated, userId });
    
    // Если пользователь не авторизован и инициализация завершена, 
    // сразу перенаправляем на страницу авторизации
    if (isInitialized && !isAuthenticated && !hasRedirectedRef.current) {
      console.log('Пользователь не аутентифицирован, перенаправляем на страницу авторизации');
      hasRedirectedRef.current = true;
      router.push('/auth');
      return;
    }
    
    // Если контекст еще не инициализирован, ждем
    if (!isInitialized) {
      console.log('Контекст аутентификации еще не инициализирован');
      return;
    }
    
    const initializeUser = async () => {
      try {
        if (isAuthenticated && userId) {
          console.log('Пользователь аутентифицирован, загружаем данные');
          // Загружаем стример-коины
          loadStreamCoins(userId);
          
          // Генерируем реферальный код
          setReferralCode(generateReferralCode(userId));
          // Завершаем загрузку
          setIsLoading(false);
        } else if (isInitialized) {
          // Дополнительная проверка на случай, если статус аутентификации изменился
          if (!hasRedirectedRef.current) {
            console.log('Пользователь не аутентифицирован после инициализации, перенаправляем на страницу авторизации');
            hasRedirectedRef.current = true;
            router.push('/auth');
          }
        }
      } catch (error) {
        console.error('Ошибка при инициализации пользователя:', error);
        setError('Произошла ошибка при загрузке данных. Пожалуйста, обновите страницу или попробуйте войти снова.');
        setIsLoading(false);
      }
    };
    
    // Инициализируем пользователя только если он аутентифицирован
    if (isAuthenticated && userId) {
      initializeUser();
    }
    
    // Очищаем таймаут при размонтировании компонента
    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, [isAuthenticated, userId, isInitialized, loadStreamCoins, generateReferralCode, router]);
  
  // Переход в профиль пользователя
  const goToProfile = () => {
    router.push('/profile');
  };
  
  // Если контекст авторизации еще не инициализирован или данные загружаются, показываем индикатор загрузки
  if (!isInitialized || isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Загрузка...</p>
      </div>
    );
  }
  
  // Если произошла ошибка, показываем сообщение об ошибке
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
      {/* В App Router мы не используем компонент Head, вместо этого метаданные определяются в metadata */}
      
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
              <h2>3. Фолловеры Twitch</h2>
              <p>Посмотреть кто подписан на вас на Twitch (фолловеры)</p>
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