"use client";

import { useState, useEffect } from 'react';
import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '../src/context/AuthContext';
import styles from './_app.module.css';
import { useRouter } from 'next/router';

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [activePath, setActivePath] = useState('/profile');

  useEffect(() => {
    setActivePath(router.pathname);
  }, [router.pathname]);

  const menuItems = [
    { name: 'Поиск', path: '/search' },
    { name: 'Подписки', path: '/subscriptions' },
    { name: 'Подписчики', path: '/followers' },
    { name: 'Профиль', path: '/profile' }, // Центральный и выше визуально
    { name: 'Настройки', path: '/settings' },
  ];

  return (
    <SessionProvider>
      <AuthProvider>
        <Component {...pageProps} />
        <nav className={styles.navBar}>
          {menuItems.map((item, index) => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`${styles.navButton} ${activePath === item.path ? styles.active : ''}`}
              style={{
                marginTop: item.name === 'Профиль' ? '-10px' : '0', // Выше других
                fontWeight: item.name === 'Профиль' ? 'bold' : 'normal',
              }}
            >
              {item.name}
            </button>
          ))}
        </nav>
      </AuthProvider>
    </SessionProvider>
  );
}
