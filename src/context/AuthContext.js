"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession, signIn /*, signOut */ } from 'next-auth/react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const { data: session, status } = useSession();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isStreamer, setIsStreamer] = useState(false);
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    if (status === 'loading') return;

    // Проверяем Telegram Mini App initData
    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
      // const initData = window.Telegram.WebApp.initDataUnsafe || {}; // Закомментировали, так как не используется
      // console.log('Telegram initData:', initData);
    }

    const savedToken = localStorage.getItem('twitchToken');
    const savedUser = localStorage.getItem('twitchUser');
    if (session) {
      setCurrentUser(session.user);
      setIsAuthenticated(true);
      // Сохраняем в localStorage для персистентности
      if (session.user && session.accessToken) {
        localStorage.setItem('twitchToken', session.accessToken);
        localStorage.setItem('twitchUser', JSON.stringify(session.user));
      }
      setLoading(false);
    } else if (savedToken && savedUser && status === 'unauthenticated') {
      // Восстанавливаем сессию из localStorage
      // console.log('Restoring session from localStorage:', { token: savedToken, user: JSON.parse(savedUser) });
      fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${savedToken}` },
        body: JSON.stringify({ user: JSON.parse(savedUser) }),
      })
        .then(response => response.json())
        .then(data => {
          if (data.valid) {
            const parsedUser = JSON.parse(savedUser);
            setCurrentUser(parsedUser);
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('twitchToken');
            localStorage.removeItem('twitchUser');
            setCurrentUser(null);
            setIsAuthenticated(false);
          }
        })
        .catch(error => {
          console.error('Error verifying token:', error);
          localStorage.removeItem('twitchToken');
          localStorage.removeItem('twitchUser');
          setCurrentUser(null);
          setIsAuthenticated(false);
        })
        .finally(() => setLoading(false));
    } else {
      setCurrentUser(null);
      setIsAuthenticated(false);
      setLoading(false);
    }

    // Инициализация демо профилей
    setProfiles([
      { id: 1, name: 'Стример', isStreamer: true },
      { id: 2, name: 'Подписчик', isStreamer: false }
    ]);
  }, [session, status]);

  const loginWithTwitch = async () => {
    try {
      await signIn('twitch', { callbackUrl: '/profile' });
    } catch (error) {
      console.error('Ошибка входа через Twitch:', error);
      throw error;
    }
  };

  const switchProfile = (profileId) => {
    const selectedProfile = profiles.find(profile => profile.id === profileId);
    if (selectedProfile) {
      setIsStreamer(selectedProfile.isStreamer);
      setCurrentUser(prev => ({
        ...prev,
        name: selectedProfile.name,
        isStreamer: selectedProfile.isStreamer
      }));
    }
  };

  const value = {
    isAuthenticated,
    currentUser,
    loading,
    loginWithTwitch,
    isStreamer,
    profiles,
    switchProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
