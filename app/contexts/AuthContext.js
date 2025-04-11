'use client';

import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation'; // Импортируем useRouter

// Создаем контекст
const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTheme, setCurrentTheme] = useState('dark'); // <<< Стейт темы
  const router = useRouter(); // Получаем router

  // Создаем Supabase клиент один раз ИСПОЛЬЗУЯ createClient
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
        console.error("[AuthContext] КРИТИЧЕСКАЯ ОШИБКА: Отсутствуют NEXT_PUBLIC_SUPABASE_URL или NEXT_PUBLIC_SUPABASE_ANON_KEY!");
        // Можно добавить состояние ошибки или вернуть заглушку клиента
        return null; 
    }
    // Используем createClient вместо createBrowserClient
    // Добавляем опцию persistSession: true (хотя она по умолчанию)
    // и autoRefreshToken: true (тоже по умолчанию)
    return createClient(url, key, {
         auth: {
             persistSession: true,
             autoRefreshToken: true,
             // detectSessionInUrl: true, // Оставляем по умолчанию (true)
             // storage: localStorage, // Используется по умолчанию
             // storageKey: 'supabase.auth.token' // Ключ по умолчанию
         }
     });
  }, []);

  // <<< useEffect для загрузки темы на клиенте >>>
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setCurrentTheme(savedTheme);
    document.body.className = savedTheme + '-theme';
    console.log(`[AuthContext] Initial theme set to: ${savedTheme}`);
  }, []);

  // <<< Функция смены темы >>>
  const toggleTheme = useCallback(() => {
    setCurrentTheme((prevTheme) => {
      const newTheme = prevTheme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', newTheme);
      document.body.className = newTheme + '-theme';
      console.log(`[AuthContext] Theme changed to: ${newTheme}`);
      return newTheme;
    });
  }, []); // Зависимостей нет, т.к. работает с localStorage и body

  useEffect(() => {
    // Не инициализируем, если клиент не создан (из-за отсутствия ключей)
    if (!supabase) {
        console.warn("[AuthContext] Supabase клиент не создан, инициализация прервана.");
        setLoading(false);
        return;
    }

    console.log('[AuthContext] Инициализация...');
    let isMounted = true; // Флаг для предотвращения обновлений после размонтирования

    async function getInitialSession() {
      console.log('[AuthContext] Попытка получить начальную сессию...');
      const { data: { session: initialSession }, error } = await supabase.auth.getSession();

      if (!isMounted) return; // Не обновляем, если компонент размонтирован

      if (error) {
        console.error('[AuthContext] Ошибка при getSession:', error.message);
      } else if (initialSession) {
        console.log('[AuthContext] Начальная сессия найдена, User ID:', initialSession.user.id);
        setUser(initialSession.user);
        setSession(initialSession);
      } else {
        console.log('[AuthContext] Начальная сессия не найдена.');
      }
      setLoading(false);
    }

    getInitialSession();

    // Подписываемся на изменения состояния аутентификации
    console.log('[AuthContext] Подписка на onAuthStateChange...');
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!isMounted) return;

        console.log(`[AuthContext] Событие: ${event}, Сессия:`, !!currentSession);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false); 

        if (event === 'SIGNED_OUT') {
          console.log('[AuthContext] Пользователь вышел. Очистка состояния.');
          if (typeof window !== 'undefined' && window.location.pathname !== '/') { 
              console.log('[AuthContext] Перенаправление на / после выхода.');
              router.push('/');
           }
        }
        if (event === 'SIGNED_IN' && currentSession) {
             console.log('[AuthContext] Пользователь вошел (событие SIGNED_IN). User ID:', currentSession.user.id);
        }
      }
    );

    // Очистка при размонтировании
    return () => {
      console.log('[AuthContext] Отписка от onAuthStateChange.');
      isMounted = false;
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [supabase, router]); // Добавляем router в зависимости

  // <<< Оборачиваем signInWithTwitch в useCallback >>>
  const signInWithTwitch = useCallback(async () => {
    if (!supabase) throw new Error("Supabase client not available");
    console.log('[AuthContext] Attempting Twitch sign in...');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'twitch',
      options: {
        // redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      console.error('[AuthContext] Twitch sign in error:', error);
      throw error;
    }
  }, [supabase]); // <<< Добавляем supabase в зависимости useCallback >>>

  // <<< Добавляем signOut (если еще не было) >>>
  const signOut = useCallback(async () => {
      if (!supabase) return;
      console.log('[AuthContext] Signing out...');
      try {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
          // Редирект будет обработан в onAuthStateChange
      } catch (error) {
          console.error('[AuthContext] Sign out error:', error);
      }
  }, [supabase]);

  // Предоставляем значения через контекст
  const value = useMemo(() => ({
    user,
    session,
    isAuthenticated: !!user,
    isLoading: loading,
    supabase, // Предоставляем клиент Supabase для прямого использования при необходимости
    signInWithTwitch, // <<< Добавляем функцию в контекст
    signOut, // <<< Передаем signOut
    currentTheme, // <<< Передаем тему
    toggleTheme // <<< Передаем функцию смены темы
  }), [user, session, loading, supabase, signInWithTwitch, signOut, currentTheme, toggleTheme]);

  // Добавляем проверку на случай, если supabase null
  if (!supabase) {
      return (
         <div>
            <h1>Ошибка конфигурации</h1>
            <p>Не установлены переменные окружения для подключения к Supabase.</p>
            <p>Проверьте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY в настройках Vercel.</p>
         </div>
      );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Хук для удобного использования контекста
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
}; 