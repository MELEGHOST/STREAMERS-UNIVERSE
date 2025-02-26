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
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        
        if (storedUser && storedToken) {
          const userData = JSON.parse(storedUser);
          setCurrentUser(userData);
          setIsAuthenticated(true);
          setIsStreamer(userData.isStreamer || false);
        } else {
          setCurrentUser(null);
          setIsAuthenticated(false);
          setIsStreamer(false);
        }

        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              Authorization: `Bearer ${storedToken || ''}`,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            setCurrentUser(data.user || null);
            setIsAuthenticated(data.isAuthenticated || false);
            setIsStreamer(data.isStreamer || false);
            if (data.user) {
              localStorage.setItem('user', JSON.stringify(data.user));
              localStorage.setItem('token', storedToken || '');
            }
          } else {
            setCurrentUser(null);
            setIsAuthenticated(false);
            setIsStreamer(false);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
          }
        } catch (serverError) {
          console.error('Server verification error:', serverError);
          if (!storedUser || !storedToken) {
            setCurrentUser(null);
            setIsAuthenticated(false);
            setIsStreamer(false);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
          }
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
    
    try {
      if (data.user) {
        setCurrentUser(data.user);
        setIsAuthenticated(true);
        setIsStreamer(data.user.isStreamer || false);
        localStorage.setItem('token', data.token || '');
        localStorage.setItem('user', JSON.stringify(data.user));
        return;
      }
      
      if (data.code) {
        const response = await fetch('/api/auth/twitch/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code: data.code }),
        });
        
        if (!response.ok) throw new Error('Не удалось авторизоваться через Twitch');
        
        const authData = await response.json();
        let userData = authData.user;

        if (!userData.isStreamer) {
          // Для подписчика получаем данные о подписках
          const subscriptionsResponse = await fetch(`https://api.twitch.tv/helix/subscriptions/user?broadcaster_id=${userData.id}`, {
            headers: {
              'Client-ID': process.env.TWITCH_CLIENT_ID,
              'Authorization': `Bearer ${authData.token}`,
            },
          });
          if (subscriptionsResponse.ok) {
            const subscriptionsData = await subscriptionsResponse.json();
            userData.subscriptions = subscriptionsData.data.map(sub => sub.broadcaster_name) || [];
          }
        }

        setCurrentUser(userData);
        setIsAuthenticated(true);
        setIsStreamer(userData.isStreamer || false);
        localStorage.setItem('token', authData.token || '');
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    if (typeof window === 'undefined') return;
    
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setCurrentUser(null);
      setIsAuthenticated(false);
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
