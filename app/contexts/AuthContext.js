'use client';

import { createContext, useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { supabase } from '../utils/supabase/client';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTheme, setCurrentTheme] = useState('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setCurrentTheme(savedTheme);
    document.body.className = savedTheme + '-theme';
  }, []);

  const toggleTheme = useCallback(() => {
    setCurrentTheme((prevTheme) => {
      const newTheme = prevTheme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', newTheme);
      document.body.className = newTheme + '-theme';
      return newTheme;
    });
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AuthContext] ===> onAuthStateChange Event: ${event} <===`);
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        console.log(`[AuthContext] Пользователь вошел. User ID: ${currentUser.id}`);
        try {
          const response = await fetch('/api/auth/check-admin', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            setUserRole(data.role);
            console.log('[AuthContext] Роль пользователя установлена:', data.role);
          } else {
            console.error('[AuthContext] Ошибка при получении роли пользователя:', response.status, await response.text());
            setUserRole('user'); // Fallback to 'user' on error
          }
        } catch (error) {
          console.error('[AuthContext] Исключение при получении роли пользователя:', error);
          setUserRole('user'); // Fallback to 'user' on exception
        }
      } else {
        setUserRole(null);
      }
      
      // setLoading(false) должен быть вызван вне зависимости от того, есть юзер или нет
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signInWithTwitch = useCallback(async () => {
    console.log('[AuthContext] Попытка входа через Twitch...');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'twitch',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('[AuthContext] Ошибка при вызове signInWithOAuth:', error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    console.log('[AuthContext] Выход из системы...');
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(() => ({
    user,
    session,
    isAuthenticated: !!user,
    isLoading: loading,
    userRole,
    supabase,
    signInWithTwitch,
    signOut,
    currentTheme,
    toggleTheme
  }), [user, session, loading, userRole, signInWithTwitch, signOut, currentTheme, toggleTheme]);
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
}; 