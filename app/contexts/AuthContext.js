'use client';

import { createContext, useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { supabase } from '../utils/supabase/client';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true); // Всегда true в начале
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

  const syncAndSetUser = useCallback(async (session) => {
    const currentUser = session?.user ?? null;
    setUser(currentUser);
    setSession(session);

    if (currentUser) {
        try {
            const syncResponse = await fetch('/api/profile/sync', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });
            if (!syncResponse.ok) throw new Error('Ошибка синхронизации профиля');
            
            const profileData = await syncResponse.json();
            setUserRole(profileData.role || 'user');
            
            if (localStorage.getItem('referrerId')) {
                localStorage.removeItem('referrerId');
            }
        } catch (error) {
            console.error('[AuthContext] Ошибка при синхронизации:', error);
            setUserRole('user'); // Фоллбэк
        }
    } else {
        setUserRole(null);
    }
  }, []);

  useEffect(() => {
    const checkInitialSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        await syncAndSetUser(session);
        setLoading(false);
    };

    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        await syncAndSetUser(session);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [syncAndSetUser]);

  const signInWithTwitch = useCallback(async () => {
    const referrerId = localStorage.getItem('referrerId');
    await supabase.auth.signInWithOAuth({
      provider: 'twitch',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          referrer_id: referrerId || undefined,
        }
      },
    });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
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
    toggleTheme
  }), [user, session, loading, userRole, signInWithTwitch, signOut, currentTheme, toggleTheme]);
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
}; 