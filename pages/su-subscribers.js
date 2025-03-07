"use client";

import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/router';
import styles from './subscriptions.module.css'; // Используем те же стили

export default function StreamersUniverseSubscribers() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [subscribers, setSubscribers] = useState([]);
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

      // Получаем подписчиков Streamers Universe из localStorage
      const suSubscribersData = JSON.parse(localStorage.getItem(`su_subscribers_${userId}`)) || [];
      setSubscribers(suSubscribersData);
      setLoading(false);
    }
  }, [router]);

  const handleManageSubscriber = (subscriberId, action) => {
    if (action === 'remove') {
      const updatedSubscribers = subscribers.filter(sub => sub.id !== subscriberId);
      setSubscribers(updatedSubscribers);
      localStorage.setItem(`su_subscribers_${userId}`, JSON.stringify(updatedSubscribers));
      console.log(`Удален подписчик ${subscriberId} из Streamers Universe`);
    }
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
      <h1>Мои подписчики в Streamers Universe</h1>
      <p className={styles.description}>
        Здесь отображаются пользователи, которые подписаны на вас в Streamers Universe.
      </p>
      
      {subscribers.length > 0 ? (
        <div className={styles.subscriptionsList}>
          {subscribers.map(subscriber => (
            <div key={subscriber.id} className={styles.subscriptionCard}>
              <div className={styles.subscriptionInfo}>
                <h3>{subscriber.name}</h3>
                <p>Подписан с: {subscriber.subscribedDate || 'Неизвестно'}</p>
              </div>
              <div className={styles.subscriptionActions}>
                <button 
                  className={styles.unfollowButton}
                  onClick={() => handleManageSubscriber(subscriber.id, 'remove')}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p>У вас пока нет подписчиков в Streamers Universe.</p>
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