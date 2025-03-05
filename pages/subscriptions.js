"use client";

import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import styles from './subscriptions.module.css';

export default function Subscriptions() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);

  useEffect(() => {
    const accessToken = Cookies.get('twitch_access_token');
    if (!accessToken) {
      window.location.href = '/auth';
    } else {
      setIsAuthenticated(true);
      const storedUser = JSON.parse(localStorage.getItem('twitch_user') || '{}');
      const userId = storedUser.id || 'unknown'; // ID из localStorage
      setUserId(userId);

      const subscriptionsData = JSON.parse(localStorage.getItem(`subscriptions_${userId}`)) || [];
      setSubscriptions(subscriptionsData);
    }
  }, []);

  const handleUnsubscribe = (streamerId) => {
    const updatedSubscriptions = subscriptions.filter(id => id !== streamerId);
    setSubscriptions(updatedSubscriptions);
    localStorage.setItem(`subscriptions_${userId}`, JSON.stringify(updatedSubscriptions));
    console.log(`Unsubscribed from ${streamerId}`);
  };

  if (!isAuthenticated) return null;

  return (
    <div className={styles.subscriptionsContainer}>
      <h1>Мои подписки</h1>
      {subscriptions.length > 0 ? (
        subscriptions.map((streamerId) => (
          <div className={styles.subscription} key={streamerId}>
            <p>Streamer ID: {streamerId}</p>
            <button className={styles.button} onClick={() => handleUnsubscribe(streamerId)}>Отписаться</button>
          </div>
        ))
      ) : (
        <p>У вас нет подписок</p>
      )}
    </div>
  );
}

export async function getStaticProps() {
  return {
    props: {}, // Нет данных для prerendering, всё загружается на клиенте
  };
}
