"use client";

import React from 'react';
import { SessionProvider, useSession } from 'next-auth/react';
import { AuthProvider } from '../src/context/AuthContext';
import styles from './_app.module.css';

function NavMenu() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return null; // Скрываем меню во время загрузки сессии
  }

  if (!session) {
    return null; // Скрываем меню, если пользователь не авторизован
  }

  return (
    <nav className={styles.nav}>
      <a href="/" className={styles.navLink}>Главная</a>
      <a href="/profile" className={styles.navLink}>Профиль</a>
      <a href="/search" className={styles.navLink}>Поиск</a>
      <a href="/subscriptions" className={styles.navLink}>Подписки</a>
      <a href="/followers" className={styles.navLink}>Подписчики</a>
      <a href="/settings" className={styles.navLink}>Настройки</a>
      <a href="/top" className={styles.navLink}>Топ</a>
      <a href="/twitch" className={styles.navLink}>Twitch</a>
    </nav>
  );
}

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <AuthProvider>
        <div className={styles.appContainer}>
          <Component {...pageProps} />
          <NavMenu />
        </div>
      </AuthProvider>
    </SessionProvider>
  );
}
