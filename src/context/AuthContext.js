import React, { createContext, useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/router';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isStreamer, setIsStreamer] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Выполняем эффект только на клиенте
    if (typeof window === 'undefined') return;

    // Проверяем статус авторизации при монтировании
    const checkLoggedIn = async () => {
      try {
        // Сначала проверяем localStorage
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        
        if (storedUser && storedToken) {
          const userData = JSON.parse(storedUser);
          setCurrentUser(userData);
          setIsAuthenticated(true);
          setIsStreamer(userData.isStreamer || false);
        }

        // Проверяем с сервером
        const response = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${storedToken || ''}`,
          },
        });
        
        const data = await response.json();
        if (response.ok && data.user) {
          setCurrentUser(data.user);
          setIsAuthenticated(true);
          setIsStreamer(data.isStreamer || false);
          localStorage.setItem('user', JSON.stringify(data.user));
          // Сохраняем текущий токен если нет нового
          if (!data.token && storedToken) {
            localStorage.setItem('token', storedToken);
          } else if (data.token) {
            localStorage.setItem('token', data.token);
          }
        } else {
          // Если проверка не прошла, очищаем данные
          setCurrentUser(null);
          setIsAuthenticated(false);
          setIsStreamer(false);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setCurrentUser(null);
        setIsAuthenticated(false);
        setIsStreamer(false);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };
    
    checkLoggedIn();
  }, []);

  const login = async (data) => {
    if (typeof window === 'undefined') return;
    
    // Если нам переданы данные пользователя, используем их
    if (data.user) {
      setCurrentUser(data.user);
      setIsAuthenticated(true);
      setIsStreamer(data.user.isStreamer || false);
      
      // Сохраняем данные авторизации
      localStorage.setItem('token', data.token || '');
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/profile');
      return;
    }
    
    // Если нам передан только код, обмениваем его на токен
    if (data.code) {
      try {
        const response = await fetch('/api/auth/twitch/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code: data.code }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to authenticate with Twitch');
        }
        
        const authData = await response.json();
        setCurrentUser(authData.user);
        setIsAuthenticated(true);
        setIsStreamer(authData.user.isStreamer || false);
        
        localStorage.setItem('token', authData.token || '');
        localStorage.setItem('user', JSON.stringify(authData.user));
        router.push('/profile');
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    }
  };

  const logout = async () => {
    if (typeof window === 'undefined') return;
    
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Logout successful:', result.message);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Очищаем локальные данные независимо от ответа сервера
      setCurrentUser(null);
      setIsAuthenticated(false);
      setIsStreamer(false);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      router.push('/');
    }
  };

  // Функция для проверки права стать стримером
  const checkStreamerEligibility = async () => {
    if (typeof window === 'undefined' || !currentUser) return false;
    
    try {
      // Проверяем количество подписчиков
      return currentUser.followers >= 265;
    } catch (error) {
      console.error('Eligibility check error:', error);
      return false;
    }
  };

  // Функция для становления стримером
  const becomeStreamer = async () => {
    if (typeof window === 'undefined' || !currentUser) return false;
    
    try {
      const isEligible = await checkStreamerEligibility();
      if (isEligible) {
        const updatedUser = { ...currentUser, isStreamer: true };
        setCurrentUser(updatedUser);
        setIsStreamer(true);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Become streamer error:', error);
      return false;
    }
  };

  const value = {
    currentUser,
    isAuthenticated,
    isStreamer,
    loading,
    login,
    logout,
    checkStreamerEligibility,
    becomeStreamer
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
