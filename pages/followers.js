"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../src/context/AuthContext';
import styles from './followers.module.css';

export default function Followers() {
  const { user, isAuthenticated } = useAuth();
  const [followers, setFollowers] = useState([]);
  const [roles, setRoles] = useState({});

  useEffect(() => {
    if (!isAuthenticated) window.location.href = '/auth';
    else {
      const followersData = JSON.parse(localStorage.getItem(`followers_${user.id}`)) || [];
      setFollowers(followersData);
      const savedRoles = JSON.parse(localStorage.getItem(`roles_${user.id}`)) || {};
      setRoles(savedRoles);
    }
  }, [isAuthenticated, user?.id]);

  if (!isAuthenticated) return null;

  const isStreamer = user?.isStreamer || false;

  const handleAssignRole = (followerId, role) => {
    const updatedRoles = { ...roles, [followerId]: role };
    setRoles(updatedRoles);
    localStorage.setItem(`roles_${user.id}`, JSON.stringify(updatedRoles));
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
