'use client';

import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js'; // Заменил импорт
import { useRouter } from 'next/navigation'; // Импортируем useRouter

// Создаем контекст
const AuthContext = createContext(undefined);

// Вспомогательная функция для промисов с таймаутом
function promiseWithTimeout(promise, ms, timeoutError = new Error('Promise timed out')) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(timeoutError), ms);
  });
  return Promise.race([
    promise.finally(() => clearTimeout(timer)), // Очищаем таймаут, если промис завершился сам
    timeout
  ]);
}

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
    return createClient(url, key);
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

    console.log('[AuthContext] useEffect Init (using createClient)...');
    let isMounted = true;

    async function getInitialSession() {
      console.log('[AuthContext] Attempting getInitialSession() using createClient with timeout...');
      try {
          const { data: sessionData, error } = await promiseWithTimeout(
            supabase.auth.getSession(),
            7000, // 7 секунд таймаут
            new Error('Supabase getSession timed out')
          );

          if (!isMounted) return;

          if (error) {
            console.error('[AuthContext] Error in getSession() (after timeout wrapper):', error.message);
          } else if (sessionData?.session) {
            const initialSession = sessionData.session;
            console.log('[AuthContext] Initial session found via getSession(), User ID:', initialSession.user.id);
            console.log('[AuthContext] Setting user and session from getSession()');
            setUser(initialSession.user);
            setSession(initialSession);
          } else {
            console.log('[AuthContext] No initial session found via getSession(). Clearing existing state (if any)...');
            if (user || session) {
                 setUser(null);
                 setSession(null);
             }
          }
      } catch (catchError) {
           if (catchError.message === 'Supabase getSession timed out') {
               console.warn('[AuthContext] supabase.auth.getSession() timed out. Assuming no active session.');
           } else {
               console.error('[AuthContext] Exception during getInitialSession():', catchError);
           }
           // В случае любой ошибки (включая таймаут), если мы все еще смонтированы, очищаем пользователя/сессию
           if (isMounted) {
               setUser(null);
               setSession(null);
           }
      } finally {
          if (isMounted) {
              console.log('[AuthContext] Setting loading = false after getInitialSession attempt (success, error, or timeout).');
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
    console.log('[AuthContext] Subscribing to onAuthStateChange (createClient)...');
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        // --- Добавляем подробные логи --- 
        console.log(`[AuthContext] ===> onAuthStateChange Event: ${event} <===`);
        console.log('[AuthContext] Current Session Object:', currentSession);
        if (currentSession?.user) {
            console.log('[AuthContext] User Object:', currentSession.user);
            console.log('[AuthContext] User Metadata:', currentSession.user.user_metadata);
        }

        if (!isMounted) {
            console.log('[AuthContext] onAuthStateChange fired but component unmounted. Ignoring.');
            return;
        }

        console.log('[AuthContext] Updating state based on onAuthStateChange... ');
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        console.log('[AuthContext] State update potentially complete. New state:', { 
            session: currentSession, 
            user: currentSession?.user ?? null 
        });

        // Восстанавливаем установку loading=false после INITIAL_SESSION
        if (event === 'INITIAL_SESSION') {
             console.log('[AuthContext] INITIAL_SESSION event received.', { session: currentSession });
             if (loading) {
                  console.log('[AuthContext] Setting loading = false after INITIAL_SESSION.');
                  setLoading(false);
             }
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
             
             // Дополнительно проверяем и сбрасываем loading, если он еще true
             if (loading) {
                console.log('[AuthContext] SIGNED_IN event: Explicitly setting loading = false.');
                setLoading(false);
             }
             
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
    if (!supabase) {
        console.error("[AuthContext] signInWithTwitch called but Supabase client is not available!");
        throw new Error("Supabase client not available");
    }
    console.log('[AuthContext] Attempting Twitch sign in...');
    try {
        let redirectUri;
        const baseRedirectPath = '/auth/callback';

        if (process.env.NEXT_PUBLIC_BASE_URL) {
          redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '')}${baseRedirectPath}`;
        } else if (typeof window !== 'undefined') {
          redirectUri = `${window.location.origin}${baseRedirectPath}`;
        } else {
          console.warn('[AuthContext] Critical: Cannot determine redirect URI for Twitch OAuth.');
          // В критической ситуации можно либо бросить ошибку, либо попытаться использовать относительный путь,
          // но это скорее всего не сработает для OAuth редиректа.
          // Для безопасности лучше бросить ошибку, чтобы проблема была сразу видна.
          throw new Error("Cannot determine redirect URI for OAuth");
        }

        console.log(`[AuthContext] Using redirect URI for Twitch: ${redirectUri}`);

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'twitch',
          options: {
            redirectTo: redirectUri, // <<< Используем настроенный Redirect URI
          },
        });
        if (error) {
            console.error('[AuthContext] Supabase signInWithOAuth ERROR:', error);
            throw error;
        }
        console.log('[AuthContext] signInWithOAuth returned data:', data);
        if (data?.url) {
            window.location.href = data.url;
        } else {
            console.error('[AuthContext] Supabase signInWithOAuth did not return a URL!');
        }
    } catch (catchError) {
        console.error('[AuthContext] Exception during signInWithOAuth:', catchError);
        throw catchError;
    }
  }, [supabase]);

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