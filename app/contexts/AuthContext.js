'use client';

import { createContext, useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { supabase } from '../utils/supabase/client';
import { usePathname, useSearchParams } from 'next/navigation';
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
    setLoading(true);

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
      } else if (_event === 'SIGNED_OUT') {
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFreshLogin = pathname === '/menu' && searchParams?.get('freshLogin') === 'true';

  useEffect(() => {
    if (isFreshLogin && supabase) {
      const refreshSession = async () => {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('[AuthContext] Error refreshing session:', error);
        } else if (session) {
          console.log('[AuthContext] Manually refreshed session:', session);
          setSession(session);
          setUser(session.user);
          // Also fetch role if needed
          if (session.user) {
            const { data: profileData } = await supabase.from('user_profiles').select('role').eq('user_id', session.user.id).single();
            setUserRole(profileData?.role || 'user');
          }
        }
      };
      refreshSession();
    }
  }, [isFreshLogin]);

  const signInWithTwitch = useCallback(async () => {
    const referrerId = localStorage.getItem('referrerId');
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
        console.error("Ошибка входа через Twitch:", error);
    }
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