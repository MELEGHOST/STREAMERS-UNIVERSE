'use client';

import { createContext, useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { supabase } from '../utils/supabase/client';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL; // Добавляем, если не импортировано

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
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
    const fetchInitialSession = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const { data: profileData, error } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('user_id', session.user.id)
            .single();
          if (error) {
            console.error('Error fetching user role:', error);
            setUserRole('user');
          } else {
            setUserRole(profileData?.role || 'user');
          }
        } else {
          setUserRole(null);
        }
      } catch (error) {
        console.error('Error fetching initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    // Попытка восстановить сессию из cookie при маунте (SSR->CSR)
    fetchInitialSession();

    // Авто-рефреш токенов, пока вкладка активна
    const refresh = setInterval(async () => {
      try {
        await supabase.auth.getSession();
      } catch {}
    }, 1000 * 60 * 5); // каждые 5 минут

    return () => clearInterval(refresh);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log(`[AuthContext] Auth event: ${_event}`);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user && (_event === 'INITIAL_SESSION' || _event === 'SIGNED_IN')) {
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();
        setUserRole(profileData?.role || 'user');

        // Улучшенная логика установки реферера
        if (_event === 'SIGNED_IN') {
          // Проверяем sessionStorage, так как он надежнее во время OAuth редиректа
          const referrerId = sessionStorage.getItem('referrerId');
          if (referrerId) {
            console.log(`[AuthContext] Found referrerId in sessionStorage: ${referrerId}. Attempting to set.`);
            try {
              const response = await fetch('/api/profile/set-referrer', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ referrerTwitchId: referrerId })
              });
              if (response.ok) {
                console.log('[AuthContext] Referrer successfully set after sign-in.');
                // Очищаем sessionStorage после успешной установки
                sessionStorage.removeItem('referrerId');
              } else {
                const errorText = await response.text();
                console.error(`[AuthContext] Failed to set referrer: ${errorText}`);
                // Очищаем в любом случае, чтобы избежать повторных попыток
                sessionStorage.removeItem('referrerId');
              }
            } catch (error) {
              console.error('[AuthContext] Error calling set-referrer API:', error);
              sessionStorage.removeItem('referrerId');
            }
          }
        }
      } else if (_event === 'SIGNED_OUT') {
        setUserRole(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signInWithTwitch = useCallback(async () => {
    // Перед входом, проверяем localStorage на наличие ref
    const referrerId = localStorage.getItem('referrerId');
    if (referrerId) {
      // Перемещаем его в sessionStorage, чтобы он "пережил" редирект на Twitch
      sessionStorage.setItem('referrerId', referrerId);
      localStorage.removeItem('referrerId');
      console.log(`[AuthContext] Moved referrerId ${referrerId} to sessionStorage.`);
    }

    const result = await supabase.auth.signInWithOAuth({
      provider: 'twitch',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          force_verify: 'true'
        },
        skipBrowserRedirect: false,
      },
    });
    if (result.error) {
      console.error("Ошибка входа через Twitch:", result.error);
    }
    return result;
  }, []);

  const signOut = useCallback(async () => {
    // Сначала немедленно очищаем локальное состояние, чтобы UI отреагировал мгновенно
    setUser(null);
    setSession(null);
    setUserRole(null);
    // А затем отправляем запрос на выход из Supabase
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Error signing out:', error);
    }
    // Динамически вычисляем имя куки
    if (supabaseUrl) {
        const ref = new URL(supabaseUrl).hostname.split('.')[0];
        const authCookieName = `sb-${ref}-auth-token`;
        const verifierCookieName = `sb-${ref}-auth-token-code-verifier`;
        document.cookie = `${authCookieName}=; Max-Age=0; path=/; secure; samesite=strict`;
        document.cookie = `${verifierCookieName}=; Max-Age=0; path=/; secure; samesite=strict`;
    } else {
        // Фallback на старые имена, если url не доступен
        document.cookie = 'sb-access-token=; Max-Age=0; path=/';
        document.cookie = 'sb-refresh-token=; Max-Age=0; path=/';
    }
    // Принудительный релоад на главную для полного сброса
    window.location.href = '/';
  }, []);

  const refreshSession = useCallback(async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[AuthContext] Error refreshing session:', error);
      return null;
    }
    setSession(session);
    setUser(session?.user ?? null);
    if (session?.user) {
      const { data: profileData } = await supabase.from('user_profiles').select('role').eq('user_id', session.user.id).single();
      setUserRole(profileData?.role || 'user');
    }
    return session;
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
    toggleTheme,
    refreshSession
  }), [user, session, loading, userRole, signInWithTwitch, signOut, currentTheme, toggleTheme, refreshSession]);
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
}; 