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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AuthContext] Auth event: ${event}`);
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        try {
          const syncResponse = await fetch('/api/profile/sync', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}` },
          });
          
          if (!syncResponse.ok) {
            const errorText = await syncResponse.text();
            throw new Error(`Sync failed: ${errorText}`);
          }
          
          const profileData = await syncResponse.json();
          setUserRole(profileData.role || 'user');

          if (localStorage.getItem('referrerId')) {
            console.log('[AuthContext] Referrer ID found, removing from localStorage.');
            localStorage.removeItem('referrerId');
          }
        } catch (error) {
          console.error('[AuthContext] Sync/Role fetch failed:', error);
          setUserRole('user'); // Fallback
        }
      } else {
        setUserRole(null);
      }
      
      // Это безопасно, потому что этот коллбэк вызывается при первоначальной загрузке
      // и устанавливает окончательное состояние загрузки.
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

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
    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
    setSession(null);
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