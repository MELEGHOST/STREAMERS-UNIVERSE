'use client';

import React from 'react';
import HoldLoginButton from '../components/HoldLoginButton/HoldLoginButton';
import styles from './auth.module.css'; // Создадим стили для центрирования

export default function AuthPage() {
  return (
    <div className={styles.container}>
      {/* Можно добавить лого или заголовок */}
      {/* <h1>Добро пожаловать!</h1> */}
      <HoldLoginButton />
    </div>
  );
} 