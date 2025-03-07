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

      // Получаем подписчиков из профиля пользователя
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
      <h1>Мои подписчики</h1>
      {followers.length > 0 ? (
        <div className={styles.followersList}>
          {followers.map((follower) => (
            <div key={follower.id} className={styles.followerItem}>
              <div className={styles.followerName}>{follower.name}</div>
              {isStreamer && (
                <div className={styles.roleButtons}>
                  <button className={styles.roleButton} onClick={() => handleAssignRole(follower.id, 'moderator')}>
                    Назначить модератором
                  </button>
                  <button className={styles.roleButton} onClick={() => handleAssignRole(follower.id, 'trusted')}>
                    Назначить доверенным
                  </button>
                  {roles[follower.id] && <span className={styles.roleTag}> Роль: {roles[follower.id]}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.noFollowers}>У вас нет подписчиков</p>
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
