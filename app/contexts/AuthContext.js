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
  const supabase = useMemo(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
  []);

  useEffect(() => {
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
        if (!isMounted) return; // Не обновляем, если компонент размонтирован

        console.log(`[AuthContext] Событие: ${event}, Сессия:`, !!currentSession);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false); // Устанавливаем loading в false после любого события

        // Обработка выхода из системы
        if (event === 'SIGNED_OUT') {
          console.log('[AuthContext] Пользователь вышел. Очистка состояния.');
          // Дополнительно можно перенаправить на страницу входа
           if (typeof window !== 'undefined' && window.location.pathname !== '/auth') { // Предотвращаем цикл редиректа
              console.log('[AuthContext] Перенаправление на /auth после выхода.');
              router.push('/auth?action=context_sign_out');
           }
        }
        // Обработка входа (на случай, если getInitialSession не сработал)
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

  // Предоставляем значения через контекст
  const value = useMemo(() => ({
    user,
    session,
    isAuthenticated: !!user, // Простой флаг для проверки аутентификации
    isLoading: loading,
    supabase // Предоставляем клиент Supabase для прямого использования при необходимости
  }), [user, session, loading, supabase]);

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