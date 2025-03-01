"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;

    // Проверяем Telegram Mini App initData
    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
      const initData = window.Telegram.WebApp.initDataUnsafe || {};
      console.log('Telegram initData:', initData);
    }

    const savedToken = localStorage.getItem('twitchToken');
    const savedUser = localStorage.getItem('twitchUser');
    if (session) {
      setUser(session.user);
      setIsAuthenticated(true);
      // Сохраняем в localStorage для персистентности
      if (session.user && session.accessToken) {
        localStorage.setItem('twitchToken', session.accessToken);
        localStorage.setItem('twitchUser', JSON.stringify(session.user));
      }
    } else if (savedToken && savedUser && status === 'unauthenticated') {
      // Восстанавливаем сессию из localStorage
      console.log('Restoring session from localStorage:', { token: savedToken, user: JSON.parse(savedUser) });
      fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${savedToken}` },
        body: JSON.stringify({ user: JSON.parse(savedUser) }),
      })
        .then(response => response.json())
        .then(data => {
          if (data.valid) {
            setUser(JSON.parse(savedUser));
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('twitchToken');
            localStorage.removeItem('twitchUser');
            setUser(null);
            setIsAuthenticated(false);
          }
        })
        .catch(error => {
          console.error('Error verifying token:', error);
          localStorage.removeItem('twitchToken');
          localStorage.removeItem('twitchUser');
          setUser(null);
          setIsAuthenticated(false);
        })
        .finally(() => setLoading(false));
    } else {
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
    }
  }, [session, status]);

  const loginWithTwitch = async () => {
    try {
      await signIn('twitch', { callbackUrl: '/profile' });
    } catch (error) {
      console.error('Ошибка входа через Twitch:', error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut({ redirect: true, callbackUrl: '/auth' });
    localStorage.removeItem('twitchToken');
    localStorage.removeItem('twitchUser');
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    isAuthenticated,
    user, // Заменяем currentUser на user для совместимости с profile.js
    loading,
    loginWithTwitch,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context; // Убираем console.log для продакшена
};
