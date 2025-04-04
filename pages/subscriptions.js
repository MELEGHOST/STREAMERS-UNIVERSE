"use client";

import React, { useState, useEffect, useCallback } from 'react';
// import Cookies from 'js-cookie';
import { useRouter } from 'next/router';
import { useAuth } from '../src/context/AuthContext';
import styles from './subscriptions.module.css';
import dynamic from 'next/dynamic'; // Импортируем dynamic

// --- Компонент с основной логикой --- 
function SubscriptionsContent() {
  const router = useRouter();
  const auth = useAuth(); // Безопасно вызывать здесь, т.к. рендерится только на клиенте
  const [subscriptions, setSubscriptions] = useState([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(true);

  const fetchSubscriptions = useCallback(async () => {
    setLoadingSubscriptions(true);
    try {
      const storedUserData = localStorage.getItem('twitch_user');
      if (!storedUserData) {
        // Не бросаем ошибку, если нет данных, просто выходим
        console.log('User data not found in localStorage for fetching subscriptions.');
        setLoadingSubscriptions(false);
        return;
      }
      const storedUser = JSON.parse(storedUserData);
      const userId = storedUser.id || 'unknown';

      // Проверяем, есть ли userId перед запросом
      if (!userId || userId === 'unknown') {
          console.error('User ID not available for fetching subscriptions.');
          setLoadingSubscriptions(false);
          return;
      }

      const response = await fetch(`/api/twitch/followed?userId=${userId}`);
      if (!response.ok) {
        // Логируем ошибку, но не прерываем все
        console.error(`Failed to fetch followed channels: ${response.status} ${response.statusText}`);
        setSubscriptions([]); // Устанавливаем пустой массив при ошибке API
      } else {
        const data = await response.json();
        if (Array.isArray(data)) {
          setSubscriptions(data);
        } else {
           console.error('Received non-array data for subscriptions:', data);
           setSubscriptions([]);
        }
      }
    } catch (error) {
      console.error('Ошибка при получении данных подписок:', error);
      setSubscriptions([]);
    } finally {
      setLoadingSubscriptions(false);
    }
  }, []);

  useEffect(() => {
    // Ждем инициализации auth контекста
    if (auth.loading === false) { 
      if (auth.isAuthenticated) {
        fetchSubscriptions();
      } else {
        // Если точно не аутентифицирован, можно перенаправить
        // или просто не загружать подписки и показать сообщение ниже
        console.log('User not authenticated, not fetching subscriptions.');
        setLoadingSubscriptions(false); // Завершаем загрузку, т.к. не будем фетчить
        router.push('/'); // Перенаправляем на главную, если не авторизован
      }
    }
    // Добавим зависимость от auth.loading, если useAuth предоставляет его
    // Если нет, условие будет работать, когда auth.isAuthenticated изменится
  }, [auth.isAuthenticated, auth.loading, router, fetchSubscriptions]); 

  const handleUnsubscribe = async (streamerId) => {
    try {
      await fetch(`/api/twitch/follow?streamerId=${streamerId}&action=unfollow`, { method: 'POST' });
      setSubscriptions(prev => prev.filter(sub => sub.id !== streamerId));
    } catch (error) {
      console.error('Ошибка при отписке:', error);
    }
  };

  // Показываем загрузку, пока контекст auth инициализируется
  if (auth.loading !== false) { 
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Проверка авторизации...</p>
      </div>
    );
  }

  // Если не аутентифицирован (после проверки)
  // Эта часть может быть избыточной, если происходит редирект выше
  if (!auth.isAuthenticated) {
    return (
      <div className={styles.container}>
        <div className={styles.authMessage}>
          <h2>Требуется авторизация</h2>
          <p>Пожалуйста, войдите в систему, чтобы просматривать подписки.</p>
          <button onClick={() => router.push('/')} className={styles.authButton}>
            Войти
          </button>
        </div>
      </div>
    );
  }

  // Загрузка самих подписок
  if (loadingSubscriptions) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Загрузка подписок...</p>
      </div>
    );
  }

  // Основной контент
  return (
    <div className={styles.subscriptionsContainer}>
      <h1>Мои фолловинги на Twitch</h1>
      <p className={styles.description}>
        Здесь отображаются каналы на Twitch, на которые вы подписаны (фолловите).
      </p>
      {subscriptions.length > 0 ? (
        <div className={styles.subscriptionsList}>
          {subscriptions.map(subscription => (
            <div key={subscription.id} className={styles.subscriptionCard}>
              <div className={styles.subscriptionInfo}>
                <h3>{subscription.name}</h3>
              </div>
              <div className={styles.subscriptionActions}>
                <button 
                  className={styles.unfollowButton}
                  onClick={() => handleUnsubscribe(subscription.id)}
                >
                  Отписаться
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p>Вы пока ни на кого не подписаны на Twitch.</p>
        </div>
      )}
      <button className={styles.backButton} onClick={() => router.push('/menu')}>
        Назад в меню
      </button>
    </div>
  );
}

// --- Динамическая обертка --- 
const SubscriptionsPage = dynamic(() => Promise.resolve(SubscriptionsContent), {
  ssr: false, // Отключаем Server-Side Rendering для этого компонента
  loading: () => ( // Показываем заглушку во время загрузки компонента
    <div className={styles.loadingContainer}>
      <div className={styles.spinner}></div>
      <p>Загрузка страницы...</p>
    </div>
  ),
});

export default SubscriptionsPage;
