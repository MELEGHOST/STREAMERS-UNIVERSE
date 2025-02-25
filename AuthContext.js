import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isStreamer, setIsStreamer] = useState(false);

  useEffect(() => {
    // Check if user is already logged in on mount
    const checkLoggedIn = async () => {
      try {
        // First try to get from localStorage
        const storedUser = localStorage.getItem('user');
        
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setCurrentUser(userData);
          setIsAuthenticated(true);
          setIsStreamer(userData.isStreamer);
        }
        
        // Verify with server
        const response = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        
        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
          setIsAuthenticated(true);
          setIsStreamer(userData.isStreamer);
          localStorage.setItem('user', JSON.stringify(userData));
        } else {
          // If server check fails, clear local data
          setCurrentUser(null);
          setIsAuthenticated(false);
          setIsStreamer(false);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkLoggedIn();
  }, []);

  const login = async (data) => {
    setCurrentUser(data.user);
    setIsAuthenticated(true);
    setIsStreamer(data.user.isStreamer);
    
    // Store auth data
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local data regardless of server response
      setCurrentUser(null);
      setIsAuthenticated(false);
      setIsStreamer(false);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  };

  // Function to check if user has the required follower count to be a streamer
  const checkStreamerEligibility = async () => {
    try {
      const response = await fetch('/api/auth/check-streamer-eligibility', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.eligible;
      }
      return false;
    } catch (error) {
      console.error('Eligibility check error:', error);
      return false;
    }
  };

  // Function to become a streamer if eligible
  const becomeStreamer = async () => {
    try {
      const response = await fetch('/api/auth/become-streamer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
        setIsStreamer(true);
        localStorage.setItem('user', JSON.stringify(userData));
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
