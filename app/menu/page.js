'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from '../../styles/menu.module.css';
import MenuHeader from '../components/MenuHeader';
import Cookies from 'js-cookie';

export default function Menu() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);  
  const [streamCoins, setStreamCoins] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Загрузка данных пользователя
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true);
        
        // Пробуем получить данные из localStorage
        const storedUser = localStorage.getItem('twitch_user');
        const isAuthenticated = localStorage.getItem('is_authenticated') === 'true';
        
        if (storedUser && isAuthenticated) {
          try {
            const userData = JSON.parse(storedUser);
            if (userData && userData.id) {
              console.log('Пользователь найден в localStorage:', userData.login);
              setUserData(userData);
              loadStreamCoins(userData.id);
              setIsLoading(false);
              return;
            }
          } catch (e) {
            console.error('Ошибка при парсинге данных пользователя из localStorage:', e);
          }
        }
        
        // Если данных нет в localStorage, пробуем получить из API
        try {
          const response = await fetch('/api/twitch/user', {
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data && data.id) {
              console.log('Данные пользователя получены из API:', data.login);
              setUserData(data);
              localStorage.setItem('twitch_user', JSON.stringify(data));
              localStorage.setItem('is_authenticated', 'true');
              loadStreamCoins(data.id);
            } else {
              // Если API не вернул данные, перенаправляем на авторизацию
              console.error('API не вернул данные пользователя');
              router.push('/auth');
              return;
            }
          } else {
            // Если запрос не удался, перенаправляем на авторизацию
            console.error('Ошибка получения данных пользователя из API:', response.status);
            router.push('/auth');
            return;
          }
        } catch (error) {
          console.error('Ошибка при запросе данных пользователя:', error);
          router.push('/auth');
          return;
        }
      } catch (error) {
        console.error('Глобальная ошибка при загрузке данных пользователя:', error);
        setError('Произошла ошибка при загрузке данных. Пожалуйста, попробуйте позже.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserData();
  }, [router]);
  
  // Загрузка стример-коинов
  const loadStreamCoins = useCallback((userId) => {
    try {
      if (!userId) {
        console.error('Ошибка при загрузке стример-коинов: userId не определен');
        setStreamCoins(100);
        return;
      }
      
      // Безопасное получение данных из localStorage
      const safeGetFromStorage = (key) => {
        if (typeof window !== 'undefined' && window.localStorage) {
          return localStorage.getItem(key);
        }
        return null;
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
            return;
          }
        } catch (e) {
          console.warn('Ошибка при парсинге данных о коинах из нового формата:', e);
        }
      }
      
      // Если новый формат не найден, проверяем старый
      const storedCoins = safeGetFromStorage(oldCoinsKey);
      if (storedCoins && !isNaN(parseInt(storedCoins, 10))) {
        setStreamCoins(parseInt(storedCoins, 10));
      } else {
        // Значение по умолчанию
        setStreamCoins(100);
      }
    } catch (error) {
      console.error('Ошибка при загрузке стример-коинов:', error);
      setStreamCoins(100);
    }
  }, []);
  
  // Функция для перехода на страницу профиля
  const goToProfilePage = () => {
    router.push('/profile');
  };
  
  // Функция для перехода на страницу коинов
  const goToCoinsPage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    router.push('/coins');
  };
  
  // Если происходит загрузка, показываем индикатор
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Загрузка меню...</p>
      </div>
    );
  }
  
  // Если произошла ошибка, показываем сообщение
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorMessage}>{error}</p>
        <button className={styles.retryButton} onClick={() => window.location.reload()}>
          Попробовать снова
        </button>
      </div>
    );
  }
  
  return (
    <div className={styles.menuContainer}>
      <div className={styles.menuContent}>
        <MenuHeader />
        
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
            onClick={() => router.push('/profile')}
          >
            <div className={styles.menuIcon}>👤</div>
            <div className={styles.menuContent}>
              <h2>6. Профиль</h2>
              <p>Посмотреть и редактировать свой профиль, настройки приватности и социальные сети</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 