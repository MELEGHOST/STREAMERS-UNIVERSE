'use client';

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Link from 'next/link';
import styles from './LoginButton.module.css';

const LoginButton = () => {
  const { user, loading, logout } = useAuth();

  const handleLogin = () => {
    window.location.href = '/auth/twitch';
  };

  const handleLogout = () => {
    logout();
  };

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <button className={styles.spaceButton} disabled>
          <span className={styles.galaxy}></span>
          <span className={styles.text}>Загрузка...</span>
        </button>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {user ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Link href="/profile" passHref>
            <button className={styles.spaceButton}>
              <span className={styles.galaxy}></span>
              <span className={styles.text}>Профиль</span>
            </button>
          </Link>
          <button className={styles.spaceButton} onClick={handleLogout}>
            <span className={styles.galaxy}></span>
            <span className={styles.text}>Выйти</span>
          </button>
        </div>
      ) : (
        <button className={styles.spaceButton} onClick={handleLogin}>
          <span className={styles.galaxy}></span>
          <span className={styles.text}>Войти</span>
        </button>
      )}
    </div>
  );
};

export default LoginButton; 