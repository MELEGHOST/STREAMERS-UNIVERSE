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
    if (session) {
      setUser(session.user);
      setIsAuthenticated(true);
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
    setLoading(false);
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
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    isAuthenticated,
    user,
    loading,
    loginWithTwitch,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  console.log('useAuth: Context value - isAuthenticated:', context.isAuthenticated);
  return context;
};
