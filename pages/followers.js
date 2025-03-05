"use client";

import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import styles from './followers.module.css';

export default function Followers() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [isStreamer, setIsStreamer] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [roles, setRoles] = useState({});

  useEffect(() => {
    const accessToken = Cookies.get('twitch_access_token');
    if (!accessToken) {
      window.location.href = '/auth';
    } else {
      setIsAuthenticated(true);
      // Предполагаем, что userId и isStreamer хранятся в localStorage или приходят из API
      const storedUser = JSON.parse(localStorage.getItem('twitch_user') || '{}');
      const userId = storedUser.id || 'unknown'; // Заменить на реальный ID, если доступен
      const isStreamer = storedUser.isStreamer || false; // Заменить на реальные данные
      setUserId(userId);
      setIsStreamer(isStreamer);

      const followersData = JSON.parse(localStorage.getItem(`followers_${userId}`)) || [];
      setFollowers(followersData);
      const savedRoles = JSON.parse(localStorage.getItem(`roles_${userId}`)) || {};
      setRoles(savedRoles);
    }
  }, []);

  if (!isAuthenticated) return null;

  const handleAssignRole = (followerId, role) => {
    const updatedRoles = { ...roles, [followerId]: role };
    setRoles(updatedRoles);
    localStorage.setItem(`roles_${userId}`, JSON.stringify(updatedRoles));
    console.log(`Assigned ${role} to follower ${followerId}`);
  };

  return (
    <div className={styles.followersContainer}>
      <h1>Мои подписчики</h1>
      {followers.length > 0 ? (
        followers.map((follower) => (
          <p key={follower.id}>
            {follower.name} (Twitch ID: {follower.id})
            {isStreamer && (
              <>
                <button className={styles.roleButton} onClick={() => handleAssignRole(follower.id, 'moderator')}>
                  Назначить модератором
                </button>
                <button className={styles.roleButton} onClick={() => handleAssignRole(follower.id, 'trusted')}>
                  Назначить доверенным
                </button>
                {roles[follower.id] && <span> Роль: {roles[follower.id]}</span>}
              </>
            )}
          </p>
        ))
      ) : (
        <p>У вас нет подписчиков</p>
      )}
    </div>
  );
}

export async function getStaticProps() {
  return {
    props: {}, // Нет данных для prerendering, всё загружается на клиенте
  };
}
