"use client";

import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/router';
import styles from './subscriptions.module.css';

export default function Subscriptions() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const accessToken = Cookies.get('twitch_access_token');
    if (!accessToken) {
      console.error('Отсутствует токен доступа, перенаправление на страницу авторизации');
      router.push('/auth');
      return;
    }
    
    try {
      setIsAuthenticated(true);
      const storedUserData = localStorage.getItem('twitch_user');
      if (!storedUserData) {
        console.error('Отсутствуют данные пользователя');
        setLoading(false);
        return;
      }
      
      const storedUser = JSON.parse(storedUserData);
      const userId = storedUser.id || 'unknown';
      setUserId(userId);

      // Получаем каналы, на которые пользователь подписан на Twitch (фолловит)
      if (storedUser.followings && Array.isArray(storedUser.followings)) {
        const formattedSubscriptions = storedUser.followings.map((name, index) => ({
          id: `subscription-${index}`,
          name: name
        }));
        setSubscriptions(formattedSubscriptions);
      } else {
        // Если нет данных в профиле, пробуем получить из localStorage
        const subscriptionsData = JSON.parse(localStorage.getItem(`subscriptions_${userId}`)) || [];
        setSubscriptions(subscriptionsData);
      }
      setLoading(false);
    } catch (error) {
      console.error('Ошибка при получении данных пользователя:', error);
      setLoading(false);
    }
  }, [router]);

  const handleUnsubscribe = (streamerId) => {
    const updatedSubscriptions = subscriptions.filter(sub => sub.id !== streamerId);
    setSubscriptions(updatedSubscriptions);
    localStorage.setItem(`subscriptions_${userId}`, JSON.stringify(updatedSubscriptions));
    console.log(`Отписался от ${streamerId} на Twitch`);
  };

  if (!isAuthenticated || loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Загрузка...</p>
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
          <p>Вы не подписаны ни на один канал на Twitch.</p>
        </div>
      )}
      
      <button className={styles.button} onClick={() => router.push('/menu')}>
        Вернуться в меню
      </button>
    </div>
  );
}

export async function getStaticProps() {
  return {
    props: {}, // Нет данных для prerendering, всё загружается на клиенте
  };
}
