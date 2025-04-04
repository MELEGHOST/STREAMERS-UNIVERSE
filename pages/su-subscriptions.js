"use client";

import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/router';
import styles from './subscriptions.module.css'; // Используем те же стили

export default function StreamersUniverseSubscriptions() {
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

      // Получаем подписки пользователя в Streamers Universe из localStorage
      const suSubscriptionsData = JSON.parse(localStorage.getItem(`su_subscriptions_${userId}`)) || [];
      setSubscriptions(suSubscriptionsData);
      setLoading(false);
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
      setLoading(false);
    }
  }, [router]);

  const handleUnsubscribe = (creatorId) => {
    const updatedSubscriptions = subscriptions.filter(sub => sub.id !== creatorId);
    setSubscriptions(updatedSubscriptions);
    localStorage.setItem(`su_subscriptions_${userId}`, JSON.stringify(updatedSubscriptions));
    // Сохранение изменений на сервере (если необходимо)
    // console.log(`Отписался от ${creatorId} в Streamers Universe`);
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
      <h1>Мои подписки в Streamers Universe</h1>
      <p className={styles.description}>
        Здесь отображаются создатели контента, на которых вы подписаны в Streamers Universe.
      </p>
      
      {subscriptions.length > 0 ? (
        <div className={styles.subscriptionsList}>
          {subscriptions.map(subscription => (
            <div key={subscription.id} className={styles.subscriptionCard}>
              <div className={styles.subscriptionInfo}>
                <h3>{subscription.name}</h3>
                <p>Подписан с: {subscription.subscribedDate || 'Неизвестно'}</p>
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
          <p>Вы не подписаны ни на одного создателя контента в Streamers Universe.</p>
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