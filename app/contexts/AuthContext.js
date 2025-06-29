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
    const getInitialSession = async () => {
      // Получаем сессию при первоначальной загрузке
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
      setLoading(false);
    };
    
    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      // Роль будет обновлена ниже, если есть пользователь
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user && session) {
        console.log(`[AuthContext] Пользователь вошел. User ID: ${user.id}`);
        
        if (localStorage.getItem('referrerId')) {
          console.log('[AuthContext] ID реферера найден и будет удален из localStorage.');
          localStorage.removeItem('referrerId');
        }

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
            setUserRole('user');
          }
        } catch (error) {
          console.error('[AuthContext] Исключение при получении роли пользователя:', error);
          setUserRole('user');
        }
      } else {
        setUserRole(null);
      }
    };
    
    fetchUserRole();
  }, [user, session]);

  const signInWithTwitch = useCallback(async () => {
    console.log('[AuthContext] Попытка входа через Twitch...');
    
    const referrerId = localStorage.getItem('referrerId');
    const queryParams = new URLSearchParams();

    if (referrerId) {
      console.log(`[AuthContext] Найден ID реферера: ${referrerId}. Добавляем в параметры.`);
      queryParams.append('referrer_id', referrerId);
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'twitch',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          referrer_id: referrerId || undefined,
        }
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