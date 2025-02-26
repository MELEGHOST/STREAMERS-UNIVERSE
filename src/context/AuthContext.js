'use client';

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
    // Only run on client
    if (typeof window === 'undefined') return;

    // Check auth status on mount
    const checkLoggedIn = async () => {
      try {
        // First check localStorage
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        
        // Устанавливаем значения по умолчанию, если localStorage пуст
        if (storedUser && storedToken) {
          const userData = JSON.parse(storedUser);
          setCurrentUser(userData);
          setIsAuthenticated(true);
          setIsStreamer(userData.isStreamer || false);
        } else {
          setCurrentUser(null);
          setIsAuthenticated(false); // Явно устанавливаем false
          setIsStreamer(false);
        }

        // Verify with server using /api/auth/me
        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              Authorization: `Bearer ${storedToken || ''}`,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            setCurrentUser(data.user || null);
            setIsAuthenticated(data.isAuthenticated === true); // Явно проверяем true
            setIsStreamer(data.isStreamer || false);
            if (data.user) {
              localStorage.setItem('user', JSON.stringify(data.user));
              localStorage.setItem('token', storedToken || '');
            }
          } else {
            // Если сервер не отвечает или возвращает ошибку, используем значения по умолчанию
            setCurrentUser(null);
            setIsAuthenticated(false); // Явно устанавливаем false
            setIsStreamer(false);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
          }
        } catch (serverError) {
          console.error('Server verification error:', serverError);
          // Если сервер недоступен, используем значения из localStorage или по умолчанию
          if (!storedUser || !storedToken) {
            setCurrentUser(null);
            setIsAuthenticated(false); // Явно устанавливаем false
            setIsStreamer(false);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setCurrentUser(null);
        setIsAuthenticated(false); // Явно устанавливаем false
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
    
    try {
      // If we're given user data directly
      if (data.user) {
        setCurrentUser(data.user);
        setIsAuthenticated(true);
        setIsStreamer(data.user.isStreamer || false);
        
        // Save auth data
        localStorage.setItem('token', data.token || '');
        localStorage.setItem('user', JSON.stringify(data.user));
        return;
      }
      
      // If we're given a code, exchange it for a token
      if (data.code) {
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
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    if (typeof window === 'undefined') return;
    
    try {
      // Call logout API
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local data regardless of server response
      setCurrentUser(null);
      setIsAuthenticated(false); // Явно устанавливаем false
      setIsStreamer(false);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      router.push('/auth');
    }
  };

  const value = {
    currentUser,
    isAuthenticated,
    isStreamer,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
