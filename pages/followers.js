"use client";

import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/router';
import styles from './followers.module.css';

export default function Followers() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [isStreamer, setIsStreamer] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [roles, setRoles] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const accessToken = Cookies.get('twitch_access_token');
    if (!accessToken) {
      router.push('/auth');
    } else {
      setIsAuthenticated(true);
      // Получаем данные пользователя из localStorage
      const storedUser = JSON.parse(localStorage.getItem('twitch_user') || '{}');
      const userId = storedUser.id || 'unknown';
      setUserId(userId);
      setIsStreamer(storedUser.isStreamer || false);

      // Получаем фолловеров Twitch из профиля пользователя
      if (storedUser.followers && Array.isArray(storedUser.followers)) {
        const formattedFollowers = storedUser.followers.map((name, index) => ({
          id: `follower-${index}`,
          name: name
        }));
        setFollowers(formattedFollowers);
      } else {
        // Если нет данных в профиле, пробуем получить из localStorage
        const followersData = JSON.parse(localStorage.getItem(`followers_${userId}`)) || [];
        setFollowers(followersData);
      }

      const savedRoles = JSON.parse(localStorage.getItem(`roles_${userId}`)) || {};
      setRoles(savedRoles);
      setLoading(false);
    }
  }, [router]);

  const handleAssignRole = (followerId, role) => {
    const updatedRoles = { ...roles, [followerId]: role };
    setRoles(updatedRoles);
    localStorage.setItem(`roles_${userId}`, JSON.stringify(updatedRoles));
    console.log(`Assigned ${role} to follower ${followerId}`);
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
    <div className={styles.followersContainer}>
      <h1>Фолловеры Twitch</h1>
      <p className={styles.description}>
        Здесь отображаются пользователи, которые подписаны на ваш канал на Twitch (фолловеры).
      </p>
      
      {followers.length > 0 ? (
        <div className={styles.followersList}>
          {followers.map(follower => (
            <div key={follower.id} className={styles.followerCard}>
              <div className={styles.followerInfo}>
                <h3>{follower.name}</h3>
                <p>Роль: {roles[follower.id] || 'Не назначена'}</p>
              </div>
              <div className={styles.followerActions}>
                <select 
                  className={styles.roleSelect}
                  value={roles[follower.id] || ''}
                  onChange={(e) => handleAssignRole(follower.id, e.target.value)}
                >
                  <option value="">Выберите роль</option>
                  <option value="mod">Модератор</option>
                  <option value="vip">VIP</option>
                  <option value="regular">Постоянный зритель</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p>У вас пока нет фолловеров на Twitch.</p>
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
