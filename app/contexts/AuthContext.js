'use client';

import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation'; // Импортируем useRouter

// Создаем контекст
const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter(); // Получаем router

  // Создаем Supabase клиент один раз
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
        console.error("[AuthContext] КРИТИЧЕСКАЯ ОШИБКА: Отсутствуют NEXT_PUBLIC_SUPABASE_URL или NEXT_PUBLIC_SUPABASE_ANON_KEY!");
        // Можно добавить состояние ошибки или вернуть заглушку клиента
        return null; 
    }
    return createBrowserClient(url, key);
  }, []);

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
           if (typeof window !== 'undefined' && window.location.pathname !== '/auth') { 
              console.log('[AuthContext] Перенаправление на /auth после выхода.');
              router.push('/auth?action=context_sign_out');
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

  // Функция входа через Twitch
  const signInWithTwitch = async () => {
    if (!supabase) throw new Error("Supabase client not available");
    console.log('[AuthContext] Attempting Twitch sign in...');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'twitch',
      options: {
        // redirectTo: `${window.location.origin}/auth/callback`, // Vercel должен сам подхватить
      },
    });
    if (error) {
      console.error('[AuthContext] Twitch sign in error:', error);
      throw error; // Пробрасываем ошибку дальше
    }
    // Редирект произойдет автоматически
  };

  // Предоставляем значения через контекст
  const value = useMemo(() => ({
    user,
    session,
    isAuthenticated: !!user,
    isLoading: loading,
    supabase, // Предоставляем клиент Supabase для прямого использования при необходимости
    signInWithTwitch // <<< Добавляем функцию в контекст
  }), [user, session, loading, supabase]);

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