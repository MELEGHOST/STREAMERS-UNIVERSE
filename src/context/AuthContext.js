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
    // Check if user is already logged in on mount
    const checkLoggedIn = async () => {
      try {
        // First try to get from localStorage as fallback
        const storedUser = localStorage.getItem('user');
        
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setCurrentUser(userData);
          setIsAuthenticated(true);
          setIsStreamer(userData.isStreamer || false);
        }

        // Verify with server using /api/auth/me
        const response = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
          },
        });
        
        const data = await response.json();
        if (response.ok) {
          setCurrentUser(data.user || null);
          setIsAuthenticated(data.isAuthenticated || false);
          setIsStreamer(data.isStreamer || false);
          if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('token', localStorage.getItem('token') || ''); // Сохраняем токен, если есть
          }
        } else {
          // If server check fails or user is not authenticated, clear local data
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
    setCurrentUser(data.user);
    setIsAuthenticated(true);
    setIsStreamer(data.user.isStreamer || false);
    
    // Store auth data
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    router.push('/');
  };

  const logout = async () => {
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
      // Clear local data regardless of server response
      setCurrentUser(null);
      setIsAuthenticated(false);
      setIsStreamer(false);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      router.push('/auth');
    }
  };

  // Function to check if user has the required follower count to be a streamer
  const checkStreamerEligibility = async () => {
    try {
      if (!currentUser) return false;
      
      // Здесь можно добавить логику проверки подписчиков через Twitch API, если нужно
      return currentUser.followers >= 265;
    } catch (error) {
      console.error('Eligibility check error:', error);
      return false;
    }
  };

  // Function to become a streamer if eligible
  const becomeStreamer = async () => {
    try {
      if (!currentUser) return false;
      
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

  return <AuthContext.Provider value={{ ...value, loading }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
