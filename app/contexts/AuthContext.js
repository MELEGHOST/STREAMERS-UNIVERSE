'use client';

import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
// import { createBrowserClient } from '@supabase/ssr'; // <<< Меняем обратно
import { createClient } from '@supabase/supabase-js'; // <<< Используем стандартный клиент
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
        return null;
    }
    // <<< Используем createClient >>>
    // Он использует localStorage для хранения сессии по умолчанию
    return createClient(url, key, {
        auth: {
            // autoRefreshToken: true, // Включено по умолчанию
            persistSession: true, // Включено по умолчанию, использует localStorage
            // detectSessionInUrl: true // Включено по умолчанию, для OAuth
        }
    });
  }, []);

  // <<< useEffect для загрузки темы на клиенте >>>
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setCurrentTheme(savedTheme);
    document.body.className = savedTheme + '-theme';
    console.log(`[AuthContext] Initial theme set to: ${savedTheme}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, []); // Зависимостей нет, выполняется один раз

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
    if (!supabase) {
        console.warn("[AuthContext] Supabase клиент не создан, инициализация прервана.");
        setLoading(false);
        return;
    }

    console.log('[AuthContext] useEffect Init (using standard createClient)...');
    let isMounted = true;

    async function getInitialSession() {
      console.log('[AuthContext] Attempting getInitialSession() using standard createClient...');
      try {
          const { data: sessionData, error } = await supabase.auth.getSession();
          console.log('[AuthContext] getSession() Result:', { sessionData, error });

          if (!isMounted) return;

          if (error) {
            console.error('[AuthContext] Error in getSession():', error.message);
          } else if (sessionData?.session) {
            const initialSession = sessionData.session;
            console.log('[AuthContext] Initial session found via getSession(), User ID:', initialSession.user.id);
            console.log('[AuthContext] Setting user and session from getSession()');
            setUser(initialSession.user);
            setSession(initialSession);
          } else {
            console.log('[AuthContext] No initial session found via getSession(). Waiting for INITIAL_SESSION event...');
          }
      } catch (catchError) {
           console.error('[AuthContext] Exception during getInitialSession():', catchError);
      } finally {
          if (isMounted && !session) {
              console.log('[AuthContext] Setting loading = false after getInitialSession attempt (no session found yet).');
              setLoading(false);
          }
      }
    }

    getInitialSession();

    // <<< Начало: Логика для реферальной ссылки >>>
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const referrerTwitchId = urlParams.get('ref');

      if (referrerTwitchId) {
        console.log(`[AuthContext] Найден ID реферрера в URL: ${referrerTwitchId}`);
        try {
          localStorage.setItem('referrerTwitchId', referrerTwitchId);
          // Очищаем параметр из URL, чтобы он не мешался
          const newUrl = window.location.pathname + window.location.search.replace(/[?&]ref=[^&]+/, '').replace(/^&/, '?');
          window.history.replaceState({}, document.title, newUrl);
          console.log('[AuthContext] ID реферрера сохранен в localStorage и удален из URL.');
        } catch (storageError) {
            console.error('[AuthContext] Не удалось сохранить ID реферрера в localStorage:', storageError);
        }
      }
    }
    // <<< Конец: Логика для реферальной ссылки >>>

    // Подписываемся на изменения состояния аутентификации
    console.log('[AuthContext] Subscribing to onAuthStateChange (standard client)...');
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log(`[AuthContext] onAuthStateChange Event: ${event}. Session present: ${!!currentSession}`);
        if (currentSession) {
            console.log(`[AuthContext] onAuthStateChange Session User ID: ${currentSession.user?.id}, Expires at: ${currentSession.expires_at ? new Date(currentSession.expires_at * 1000) : 'N/A'}`);
        }

        if (!isMounted) {
            console.log('[AuthContext] onAuthStateChange fired but component unmounted. Ignoring.');
            return;
        }

        console.log('[AuthContext] Updating state based on onAuthStateChange...');
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (loading) {
            console.log(`[AuthContext] Setting loading = false after onAuthStateChange event: ${event}.`);
            setLoading(false);
        }

        if (event === 'SIGNED_OUT') {
          console.log('[AuthContext] User signed out. Clearing state and redirecting.');
          setUser(null);
          setSession(null);
          if (typeof window !== 'undefined' && window.location.pathname !== '/') { 
              console.log('[AuthContext] Redirecting to / after sign out.');
              router.push('/');
           }
        }
        
        if (event === 'SIGNED_IN' && currentSession) {
             const userId = currentSession.user.id;
             const userTwitchId = currentSession.user.user_metadata?.provider_id;
             console.log(`[AuthContext] Событие SIGNED_IN. User ID: ${userId}, Twitch ID: ${userTwitchId}`);
             
             // 1. Гарантируем создание/обновление профиля фоновым запросом
             if (userTwitchId && currentSession.access_token) {
                 console.log(`[AuthContext] Запускаем фоновый запрос к /api/twitch/user для ${userTwitchId} для гарантии создания/обновления профиля...`);
                 try {
                      await fetch(`/api/twitch/user?userId=${userTwitchId}&fetchProfile=true`, { // fetchProfile=true, чтобы сработал upsert
                          method: 'GET',
                          headers: {
                              'Authorization': `Bearer ${currentSession.access_token}`
                          }
                      });
                      // Не проверяем ответ, просто запускаем
                      console.log(`[AuthContext] Фоновый запрос к /api/twitch/user завершен.`);
                 } catch (profileFetchError) {
                      console.error(`[AuthContext] Ошибка фонового запроса к /api/twitch/user:`, profileFetchError);
                      // Продолжаем попытку установить реферрера
                 }
             }

             // 2. Проверяем и отправляем реферрера
             const storedReferrerId = localStorage.getItem('referrerTwitchId');
             if (storedReferrerId) {
                 console.log(`[AuthContext] Найден сохраненный ID реферрера: ${storedReferrerId}. Попытка отправки на бэкенд...`);
                 try {
                      const token = currentSession.access_token;
                      if (!token) throw new Error('Access token не найден в сессии после SIGNED_IN');
                      
                      // <<< Лог перед fetch >>>
                      console.log(`[AuthContext] Отправка POST на /api/profile/set-referrer. Body:`, { referrerTwitchId: storedReferrerId });

                      const response = await fetch('/api/profile/set-referrer', {
                          method: 'POST',
                          headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                          },
                          body: JSON.stringify({ referrerTwitchId: storedReferrerId })
                      });

                      const responseData = await response.json(); // <<< Читаем ответ
                      console.log(`[AuthContext] Ответ от /api/profile/set-referrer:`, { status: response.status, data: responseData }); // <<< Лог ответа

                      if (!response.ok) {
                           console.error('[AuthContext] Ошибка отправки реферрера на бэкенд:', response.status, responseData);
                      } else {
                           console.log('[AuthContext] ID реферрера успешно обработан бэкендом.');
                           localStorage.removeItem('referrerTwitchId');
                      }
                 } catch (fetchError) {
                      console.error('[AuthContext] Исключение при отправке реферрера:', fetchError);
                 }
             } else {
                 console.log('[AuthContext] Сохраненный ID реферрера не найден.');
             }
        }
        if (event === 'TOKEN_REFRESHED') {
             console.log('[AuthContext] Token refreshed successfully.', { newSession: currentSession });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, router]); // Игнорируем предупреждение о зависимостях loading, session, user

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