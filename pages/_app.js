"use client";

import { useState, useEffect } from 'react';
import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '../src/context/AuthContext';
import styled from 'styled-components';
import { useRouter } from 'next/router';

const NavBar = styled.div`
  position: fixed;
  bottom: 0;
  width: 100%;
  background: #1a1a4a;
  display: flex;
  justify-content: space-around;
  padding: 10px;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
`;

const NavButton = styled.button`
  background: #3498db;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 8px 16px;
  font-size: 0.9em;
  cursor: pointer;
  transition: background 0.3s;

  &:hover {
    background: #2980b9;
  }

  &.active {
    background: #ff4444; /* Тёмно-красный для выделения профиля */
    &:hover {
      background: #cc3333;
    }
  }
`;

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
        <NavBar>
          {menuItems.map((item, index) => (
            <NavButton
              key={item.path}
              onClick={() => router.push(item.path)}
              className={activePath === item.path ? 'active' : ''}
              style={{
                marginTop: item.name === 'Профиль' ? '-10px' : '0', // Выше других
                fontWeight: item.name === 'Профиль' ? 'bold' : 'normal',
              }}
            >
              {item.name}
            </NavButton>
          ))}
        </NavBar>
      </AuthProvider>
    </SessionProvider>
  );
}
