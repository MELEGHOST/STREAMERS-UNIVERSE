"use client";

import React, { useState, useEffect, useCallback } from 'react';
// import Cookies from 'js-cookie';
import { useRouter } from 'next/router';
import { useAuth } from '../src/context/AuthContext';
import styles from './subscriptions.module.css';

export default function Subscriptions() {
  const router = useRouter();
  // const { isAuthenticated } = useAuth(); // Убираем вызов useAuth отсюда
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [authState, setAuthState] = useState({ isAuthenticated: false }); // Состояние для аутентификации

  // Этот useEffect для установки isClient
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Используем useAuth только на клиенте
  const auth = useAuth(); // Вызываем useAuth здесь, но используем внутри эффекта
  useEffect(() => {
    if (isClient) {
      // Обновляем состояние аутентификации на клиенте
      setAuthState({ isAuthenticated: auth.isAuthenticated }); 
    }
  }, [isClient, auth.isAuthenticated]); // Зависим от isClient и auth.isAuthenticated

  const fetchSubscriptions = useCallback(async () => { // Оборачиваем в useCallback
    try {
      const storedUserData = localStorage.getItem('twitch_user');
      if (!storedUserData) {
        throw new Error('User data not found in localStorage');
      }
      const storedUser = JSON.parse(storedUserData);
      const userId = storedUser.id || 'unknown';

      const response = await fetch(`/api/twitch/followed?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch followed channels');
      }
      const data = await response.json();
      setSubscriptions(data);
    } catch (error) {
      console.error('Ошибка при получении данных пользователя:', error);
    } finally {
      setLoading(false);
    }
  }, []); // Пустой массив зависимостей, если нет внешних зависимостей

  useEffect(() => {
    if (!isClient) {
      return;
    }

    // Используем authState.isAuthenticated
    if (!authState.isAuthenticated) {
      const storedUserData = localStorage.getItem('twitch_user');
      if (!storedUserData) {
        console.log('User not authenticated, redirecting from subscriptions.');
        router.push('/');
        return;
      }
      setLoading(true);
      return;
    }

    fetchSubscriptions();

  }, [authState.isAuthenticated, router, isClient, fetchSubscriptions]); // Добавляем fetchSubscriptions

  const handleUnsubscribe = async (streamerId) => {
    try {
      await fetch(`/api/twitch/follow?streamerId=${streamerId}&action=unfollow`, { method: 'POST' });
      setSubscriptions(prev => prev.filter(sub => sub.id !== streamerId)); // Фильтруем по sub.id (исправлено)
    } catch (error) {
      console.error('Ошибка при отписке:', error);
    }
  };

  if (!isClient) {
    return null;
  }

  // Используем authState.isAuthenticated
  if (!authState.isAuthenticated) {
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

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Загрузка подписок...</p>
      </div>
    );
  }

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
                  onClick={() => handleUnsubscribe(subscription.id)} // Передаем subscription.id
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
