'use client';

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Link from 'next/link';
import styles from './LoginButton.module.css';
import { useTranslation } from 'react-i18next';

const LoginButton = () => {
  const { t } = useTranslation('common');
  const { user, loading, login, logout } = useAuth();

  const handleLogin = async () => {
    login();
  };

  const handleLogout = () => {
    logout();
  };

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <button className={styles.spaceButton} disabled>
          <span className={styles.galaxy}></span>
          <span className={styles.text}>{t('loading')}</span>
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
              <span className={styles.text}>{t('profile')}</span>
            </button>
          </Link>
          <button className={styles.spaceButton} onClick={handleLogout}>
            <span className={styles.galaxy}></span>
            <span className={styles.text}>{t('logout')}</span>
          </button>
        </div>
      ) : (
        <button className={styles.spaceButton} onClick={handleLogin}>
          <span className={styles.galaxy}></span>
          <span className={styles.text}>{t('login')}</span>
        </button>
      )}
    </div>
  );
};

export default LoginButton; 