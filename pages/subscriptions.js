"use client";

import React, { useState, useEffect } from 'react';
// import Cookies from 'js-cookie';
import { useRouter } from 'next/router';
import { useAuth } from '../src/context/AuthContext';
import styles from './subscriptions.module.css';

export default function Subscriptions() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchSubscriptions = async () => {
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
  };

  useEffect(() => {
    if (!isClient) {
      return;
    }

    if (!isAuthenticated) {
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

  }, [isAuthenticated, router, isClient]);

  const handleUnsubscribe = async (streamerId) => {
    try {
      await fetch(`/api/twitch/follow?streamerId=${streamerId}&action=unfollow`, { method: 'POST' });
      setSubscriptions(prev => prev.filter(sub => sub.streamer_id !== streamerId));
    } catch (error) {
      console.error('Ошибка при отписке:', error);
    }
  };

  if (!isClient) {
    return null;
  }

  if (!isAuthenticated) {
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

export async function getStaticProps() {
  return {
    props: {}, // Нет данных для prerendering, всё загружается на клиенте
  };
}
