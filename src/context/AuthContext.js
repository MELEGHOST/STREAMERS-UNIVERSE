// Контекст для управления авторизацией
'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/router';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Состояния для хранения данных пользователя
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isStreamer, setIsStreamer] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Выполняется только на стороне клиента
    if (typeof window === 'undefined') return;

    // Проверка статуса авторизации при загрузке
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
        } else {
          setCurrentUser(null);
          setIsAuthenticated(false);
          setIsStreamer(false);
        }

        try {
          // Проверка авторизации на сервере
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
          console.error('Ошибка проверки на сервере:', serverError);
          if (!storedUser || !storedToken) {
            setCurrentUser(null);
            setIsAuthenticated(false);
            setIsStreamer(false);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
          }
        }
      } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
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
    // Выполняется только на стороне клиента
    if (typeof window === 'undefined') return;
    
    try {
      if (data.user) {
        setCurrentUser(data.user);
        setIsAuthenticated(true);
        setIsStreamer(data.user.isStreamer || false);
        localStorage.setItem('token', data.token || '');
        localStorage.setItem('user', JSON.stringify(data.user));
        console.log('Login successful, redirecting to /profile:', data.user); // Отладка
        router.push('/profile'); // Перенаправляем на профиль после успешного входа
        return;
      }
      
      if (data.code) {
        // Обмен кода на токен через сервер
        const response = await fetch('/api/auth/twitch/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code: data.code }),
        });
        
        console.log('Twitch callback response in AuthContext:', { 
          status: response.status, 
          statusText: response.statusText, 
          ok: response.ok 
        }); // Отладка

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Не удалось авторизоваться через Twitch: ${response.status} - ${errorText}`);
        }
        
        const authData = await response.json();
        let userData = authData.user;

        if (!userData.isStreamer) {
          // Для подписчика получаем данные о подписках
          userData = {
            id: userData.id,
            name: userData.name, // Используем реальный никнейм из Twitch
            isStreamer: false,
            followers: 0,
            subscriptions: [], // Инициализируем пустой массив подписок
          };
          // Получаем данные о подписках через Twitch API
          const subscriptionsResponse = await fetch(`https://api.twitch.tv/helix/subscriptions/user?broadcaster_id=${userData.id}`, {
            headers: {
              'Client-ID': process.env.TWITCH_CLIENT_ID,
              'Authorization': `Bearer ${authData.token}`,
            },
          });
          if (subscriptionsResponse.ok) {
            const subscriptionsData = await subscriptionsResponse.json();
            userData.subscriptions = subscriptionsData.data.map(sub => sub.broadcaster_name) || [];
          } else {
            userData.subscriptions = []; // Устанавливаем пустой массив при ошибке
            console.log('Subscriptions error in AuthContext:', { 
              status: subscriptionsResponse.status, 
              statusText: subscriptionsResponse.statusText 
            }); // Отладка
          }
        } else {
          // Для стримера используем реальные данные из Twitch
          if (userData.followers < 265) {
            throw new Error('Недостаточно подписчиков для регистрации как стример (требуется минимум 265)');
          }
          userData.isStreamer = true;
        }

        setCurrentUser(userData);
        setIsAuthenticated(true);
        setIsStreamer(userData.isStreamer || false);
        localStorage.setItem('token', authData.token || '');
        localStorage.setItem('user', JSON.stringify(userData));
        console.log('Login successful with user data, redirecting to /profile:', userData); // Отладка
        router.push('/profile'); // Перенаправляем на профиль после успешного входа
      }
    } catch (error) {
      console.error('Ошибка входа:', error);
      throw error;
    }
  };

  const logout = async () => {
    // Выполняется только на стороне клиента
    if (typeof window === 'undefined') return;
    
    try {
      // Вызов API для выхода
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
    } catch (error) {
      console.error('Ошибка выхода:', error);
    } finally {
      // Очистка данных независимо от ответа сервера
      setCurrentUser(null);
      setIsAuthenticated(false);
      setIsStreamer(false);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('twitch_auth_state'); // Удаляем состояние авторизации Twitch
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
