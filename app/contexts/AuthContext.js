'use client';

import { createContext, useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { supabase } from '../utils/supabase/client';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AuthContext] onAuthStateChange event: ${event}`, session);
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        try {
            // Сначала синхронизируем профиль (создаем, если его нет)
            const syncResponse = await fetch('/api/profile/sync', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${session.access_token}` },
            });
            
            if (!syncResponse.ok) {
                const errorData = await syncResponse.json();
                throw new Error(errorData.error || 'Ошибка синхронизации профиля');
            }
            
            const profileData = await syncResponse.json();
            console.log('[AuthContext] Профиль синхронизирован:', profileData);
            setUserRole(profileData.role || 'user');

            // Теперь, когда профиль точно есть, можно безопасно удалять referrerId
            if (localStorage.getItem('referrerId')) {
              console.log('[AuthContext] ID реферера найден и будет удален из localStorage.');
              localStorage.removeItem('referrerId');
            }
        } catch (error) {
            console.error('[AuthContext] Исключение при синхронизации профиля или получении роли:', error);
            // Если что-то пошло не так, ставим роль по-умолчанию, но не ломаем приложение
            setUserRole('user');
        }
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signInWithTwitch = useCallback(async () => {
    console.log('[AuthContext] Попытка входа через Twitch...');
    
    const referrerId = localStorage.getItem('referrerId');
    const queryParams = new URLSearchParams();

    if (referrerId) {
      console.log(`[AuthContext] Найден ID реферера: ${referrerId}. Добавляем в параметры.`);
      queryParams.append('referrer_id', referrerId);
    }

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
      console.error('[AuthContext] Ошибка при вызове signInWithOAuth:', error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    console.log('[AuthContext] Выход из системы...');
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