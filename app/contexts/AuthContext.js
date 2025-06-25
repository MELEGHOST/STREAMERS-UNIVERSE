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
    if (!supabase) {
      console.warn("[AuthContext] Supabase клиент не создан, аутентификация не работает.");
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // <<< Начало: Логика для реферальной ссылки >>>
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const referrerTwitchId = urlParams.get('ref');

      if (referrerTwitchId) {
        console.log(`[AuthContext] Найден ID реферрера в URL: ${referrerTwitchId}`);
        try {
          localStorage.setItem('referrerTwitchId', referrerTwitchId);
          // Очищаем параметр из URL
          const newUrl = window.location.pathname + window.location.search.replace(/[?&]ref=[^&]+/, '').replace(/^&/, '?');
          window.history.replaceState({}, document.title, newUrl);
        } catch (storageError) {
          console.error('[AuthContext] Не удалось сохранить ID реферрера в localStorage:', storageError);
        }
      }
    }
    // <<< Конец: Логика для реферальной ссылки >>>

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log(`[AuthContext] ===> onAuthStateChange Event: ${event} <===`);
        
        const sessionActive = currentSession?.user;
        
        setSession(currentSession);
        setUser(sessionActive ?? null);
        
        if (sessionActive) {
          // Если есть сессия, получаем роль
          await fetchUserRole(); 
          
          if (event === 'SIGNED_IN') {
             console.log(`[AuthContext] Пользователь вошел. User ID: ${sessionActive.id}`);
             handlePostSignIn(currentSession);
          }
        } else {
          // Если сессии нет (SIGNED_OUT), сбрасываем роль
          setUserRole(null);
          if (event === 'SIGNED_OUT') {
            handleRedirect();
          }
        }

        setLoading(false);
      }
    );

    return () => {
      console.log('[AuthContext] Отписка от onAuthStateChange.');
      authListener?.subscription?.unsubscribe();
    };
  }, [supabase, handleRedirect]);

  const fetchUserRole = async () => {
    try {
        const response = await fetch('/api/auth/check-admin');
        if (!response.ok) {
            // Не является ошибкой, если пользователь просто не админ (401)
            if (response.status !== 401) {
               console.error('[AuthContext] Ошибка при проверке роли, статус:', response.status);
            }
            setUserRole(null);
            return;
        }
        const data = await response.json();
        console.log(`[AuthContext] Роль пользователя успешно получена: ${data.role}`);
        setUserRole(data.role);
    } catch (error) {
        console.error('[AuthContext] Исключение при запросе роли пользователя:', error);
        setUserRole(null);
    }
  };

  const handlePostSignIn = async (currentSession) => {
    const userTwitchId = currentSession.user.user_metadata?.provider_id;
    const accessToken = currentSession.access_token;

    if (!userTwitchId || !accessToken) {
        console.error('[AuthContext] Недостаточно данных для обработки после входа.');
        return;
    }

    // 1. Гарантируем создание/обновление профиля
    try {
        await fetch(`/api/twitch/user?userId=${userTwitchId}&fetchProfile=true`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
    } catch (profileError) {
        console.error(`[AuthContext] Ошибка фонового запроса на обновление профиля:`, profileError);
    }
    
    // 2. Обрабатываем реферальную ссылку
    const storedReferrerId = localStorage.getItem('referrerTwitchId');
    if (storedReferrerId) {
        try {
            const response = await fetch('/api/profile/set-referrer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({ referrerTwitchId: storedReferrerId })
            });

            if (response.ok) {
                console.log('[AuthContext] ID реферрера успешно обработан.');
                localStorage.removeItem('referrerTwitchId');
            } else {
                const errorData = await response.json();
                console.error('[AuthContext] Ошибка отправки реферрера на бэкенд:', errorData);
            }
        } catch (referrerError) {
            console.error('[AuthContext] Исключение при отправке реферрера:', referrerError);
        }
    }
  };

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