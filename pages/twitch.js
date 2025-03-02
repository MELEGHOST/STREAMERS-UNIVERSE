"use client";

import React from 'react';
import { useAuth } from '../src/context/AuthContext';
import styles from './twitch.module.css';

export default function Twitch() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <div className={styles.error}>Please log in</div>;
  }

  return (
    <div className={styles.twitchContainer}>
      <h1>Twitch Integration</h1>
      <p>Connect and manage your Twitch streams here.</p>
    </div>
  );
}
