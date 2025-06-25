'use client';

import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTheme, setCurrentTheme] = useState('dark');
  const router = useRouter();

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      console.error("[AuthContext] КРИТИЧЕСКАЯ ОШИБКА: Отсутствуют NEXT_PUBLIC_SUPABASE_URL или NEXT_PUBLIC_SUPABASE_ANON_KEY!");
      return null;
    }
    return createClient(url, key);
  }, []);

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

  const handleRedirect = useCallback(() => {
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        router.push('/');
    }
  }, [router]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AuthContext] ===> onAuthStateChange Event: ${event} <===`);
      setSession(session);
      setUser(session?.user ?? null);

      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        console.log(`[AuthContext] Пользователь вошел. User ID: ${session.user.id}`);
        try {
          const response = await fetch('/api/auth/check-admin');
          if (response.ok) {
            const data = await response.json();
            setUserRole(data.role);
            console.log('[AuthContext] Роль пользователя установлена:', data.role);
          } else {
            console.error('[AuthContext] Ошибка при получении роли пользователя:', response.status);
            setUserRole('user');
          }
        } catch (error) {
          console.error('[AuthContext] Исключение при получении роли пользователя:', error);
          setUserRole('user');
        } finally {
            setLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        setUserRole(null);
        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [supabase]);

  const signInWithTwitch = useCallback(async () => {
    if (!supabase) {
      console.error("[AuthContext] signInWithTwitch: Supabase клиент недоступен!");
      throw new Error("Supabase client not available");
    }
    console.log('[AuthContext] Попытка входа через Twitch...');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'twitch',
      options: {
        // Supabase автоматически использует текущий URL, если redirectTo не указан.
        // Для OAuth callback, нужно указать путь, который мы настроили в Supabase UI.
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('[AuthContext] Ошибка при вызове signInWithOAuth:', error);
      throw error;
    }
  }, [supabase]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    console.log('[AuthContext] Выход из системы...');
    await supabase.auth.signOut();
  }, [supabase]);

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
  }), [user, session, loading, userRole, supabase, signInWithTwitch, signOut, currentTheme, toggleTheme]);
  
  if (!supabase) {
      return (
         <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1>Ошибка конфигурации</h1>
            <p>Не удалось подключиться к сервису аутентификации.</p>
            <p>Пожалуйста, проверьте переменные окружения.</p>
         </div>
      );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
}; 