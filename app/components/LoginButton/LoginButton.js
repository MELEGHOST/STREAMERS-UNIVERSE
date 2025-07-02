'use client';

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import styles from './LoginButton.module.css';
import { useTranslation } from 'react-i18next';

const LoginButton = () => {
  const { t, i18n } = useTranslation('common');
  const { user, loading, signInWithTwitch } = useAuth();

  const handleLogin = async () => {
    await signInWithTwitch();
  };

  if (loading || !i18n.isInitialized) {
    return (
      <div className={styles.wrapper}>
        <button className={styles.spaceButton} disabled>
          <span className={styles.galaxy}></span>
          <span className={styles.text}>{t('loading')}...</span>
        </button>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {user ? (
        <Link href="/menu" passHref className={styles.profileLink}>
          <Image 
            src={user.user_metadata.avatar_url || '/logo.png'} 
            alt={user.user_metadata.name || 'User Avatar'}
            width={40}
            height={40}
            className={styles.profileAvatar}
          />
          <span className={styles.profileName}>{user.user_metadata.name}</span>
        </Link>
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