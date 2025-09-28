'use client';

import { createContext, useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { supabase } from '../utils/supabase/client';

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
    let unsub;
    const init = async () => {
      setLoading(true);
      try {
        // Триажим текущую сессию (может быть уже в cookie после редиректа)
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const { data: profileData, error } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('user_id', session.user.id)
            .single();
          setUserRole(error ? 'user' : (profileData?.role || 'user'));
        } else {
          setUserRole(null);
        }
      } catch (error) {
        console.error('Error fetching initial session:', error);
      }

      // Подпишемся и снимаем loading только после первого события (INITIAL_SESSION)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
        console.log(`[AuthContext] Auth event: ${_event}`);
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('user_id', newSession.user.id)
            .single();
          setUserRole(profileData?.role || 'user');

          if (_event === 'SIGNED_IN') {
            const referrerId = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('referrerId') : null;
            if (referrerId) {
              try {
                const response = await fetch('/api/profile/set-referrer', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${newSession.access_token}`
                  },
                  body: JSON.stringify({ referrerTwitchId: referrerId })
                });
                sessionStorage.removeItem('referrerId');
                if (!response.ok) {
                  console.error('[AuthContext] Failed to set referrer after SIGNED_IN');
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
        // снимаем loading после первого же события
        setLoading(false);
      });
      unsub = subscription?.unsubscribe;

      // Фолбэк: если событие не пришло (редкий случай) — снимаем загрузку спустя таймаут
      setTimeout(() => setLoading(false), 1500);
    };
    init();

    // Авто-рефреш токенов, пока вкладка активна
    const refresh = setInterval(async () => {
      try { await supabase.auth.getSession(); } catch {}
    }, 1000 * 60 * 5);

    return () => {
      try { unsub?.(); } catch {}
      clearInterval(refresh);
    };
  }, []);

  // Убрали дублирующую подписку onAuthStateChange

  const signInWithTwitch = useCallback(async () => {
    // Перед входом, проверяем localStorage на наличие ref
    const referrerId = typeof localStorage !== 'undefined' ? localStorage.getItem('referrerId') : null;
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
        queryParams: { force_verify: 'false' },
        // Отдадим управление редиректом нашей кнопке (учёт Telegram WebApp и т.п.)
        skipBrowserRedirect: true,
      },
    });
    if (result.error) {
      console.error("Ошибка входа через Twitch:", result.error);
    }
    return result;
  }, []);

  const signOut = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/signout', { method: 'POST' });
      if (!res.ok) {
        console.error('[Auth] signout API failed');
      }
    } catch (e) {
      console.error('[Auth] signout API error', e);
    }
    // локальный сброс состояния и редирект
    setUser(null);
    setSession(null);
    setUserRole(null);
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