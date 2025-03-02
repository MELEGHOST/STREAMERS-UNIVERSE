"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../src/context/AuthContext';
import styles from './subscriptions.module.css';

export default function Subscriptions() {
  const { user, isAuthenticated } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) window.location.href = '/auth';
    else {
      const subscriptionsData = JSON.parse(localStorage.getItem(`subscriptions_${user.id}`)) || [];
      setSubscriptions(subscriptionsData);
    }
  }, [isAuthenticated, user?.id]);

  const handleUnsubscribe = (streamerId) => {
    const updatedSubscriptions = subscriptions.filter(id => id !== streamerId);
    setSubscriptions(updatedSubscriptions);
    localStorage.setItem(`subscriptions_${user.id}`, JSON.stringify(updatedSubscriptions));
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
