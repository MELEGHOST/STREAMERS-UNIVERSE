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
      router.push('/auth');
    } else {
      setIsAuthenticated(true);
      const storedUser = JSON.parse(localStorage.getItem('twitch_user') || '{}');
      const userId = storedUser.id || 'unknown';
      setUserId(userId);

      // Получаем подписки из профиля пользователя
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
    }
  }, [router]);

  const handleUnsubscribe = (streamerId) => {
    const updatedSubscriptions = subscriptions.filter(sub => sub.id !== streamerId);
    setSubscriptions(updatedSubscriptions);
    localStorage.setItem(`subscriptions_${userId}`, JSON.stringify(updatedSubscriptions));
    console.log(`Unsubscribed from ${streamerId}`);
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
      <h1>Мои подписки</h1>
      {subscriptions.length > 0 ? (
        <div className={styles.subscriptionsList}>
          {subscriptions.map((subscription) => (
            <div className={styles.subscriptionItem} key={subscription.id}>
              <div className={styles.subscriptionName}>{subscription.name}</div>
              <button className={styles.button} onClick={() => handleUnsubscribe(subscription.id)}>Отписаться</button>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.noSubscriptions}>У вас нет подписок</p>
      )}
      
      <div className={styles.actionButtons}>
        <button className={styles.button} onClick={() => router.push('/menu')}>
          Вернуться в меню
        </button>
      </div>
    </div>
  );
}

export async function getStaticProps() {
  return {
    props: {}, // Нет данных для prerendering, всё загружается на клиенте
  };
}
