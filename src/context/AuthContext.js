"use client";

const React = require('react');
const { useRouter } = require('next/router');
const axios = require('axios');

const AuthContext = React.createContext();

function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isStreamer, setIsStreamer] = React.useState(false);
  const [profiles, setProfiles] = React.useState([]);
  const router = useRouter();

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    console.log('AuthContext: Starting checkLoggedIn');
    const checkLoggedIn = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        const storedProfiles = JSON.parse(localStorage.getItem('profiles') || '[]');

        console.log('AuthContext: Stored data - User:', storedUser, 'Token:', storedToken, 'Profiles:', storedProfiles);

        setProfiles(storedProfiles);

        if (storedUser && storedToken) {
          const userData = JSON.parse(storedUser);
          console.log('AuthContext: User found, setting state - User:', userData);
          setCurrentUser(userData);
          setIsAuthenticated(true);
          setIsStreamer(userData.isStreamer || false);
        } else {
          console.log('AuthContext: No stored user or token, resetting state');
          setCurrentUser(null);
          setIsAuthenticated(false);
          setIsStreamer(false);
        }

        try {
          console.log('AuthContext: Fetching /api/auth/me with token:', storedToken);
          const response = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${storedToken || ''}` },
          });

          console.log('AuthContext: Response from /api/auth/me - Status:', response.status, 'OK:', response.ok);

          if (response.ok) {
            const data = await response.json();
            console.log('AuthContext: Me API response:', data);
            setCurrentUser(data.user || null);
            setIsAuthenticated(true);
            setIsStreamer(data.user?.isStreamer || false);
            if (data.user) {
              localStorage.setItem('user', JSON.stringify(data.user));
              localStorage.setItem('token', storedToken || '');
              const newProfiles = [...new Set([...storedProfiles, { 
                id: data.user.id, 
                name: data.user.name, 
                isStreamer: data.user.isStreamer 
              }])];
              setProfiles(newProfiles);
              localStorage.setItem('profiles', JSON.stringify(newProfiles));
            }
          } else {
            console.log('AuthContext: Me API failed, clearing auth');
            setCurrentUser(null);
            setIsAuthenticated(false);
            setIsStreamer(false);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
          }
        } catch (serverError) {
          console.error('AuthContext: Server error in /api/auth/me:', serverError);
          if (!storedUser || !storedToken) {
            setCurrentUser(null);
            setIsAuthenticated(false);
            setIsStreamer(false);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
          }
        }
      } catch (error) {
        console.error('AuthContext: Error in checkLoggedIn:', error);
        setCurrentUser(null);
        setIsAuthenticated(false);
        setIsStreamer(false);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      } finally {
        console.log('AuthContext: CheckLoggedIn completed, loading:', loading, 'isAuthenticated:', isAuthenticated);
        setLoading(false);
      }
    };

    checkLoggedIn();
  }, []);

  const loginWithTwitch = async () => {
    if (typeof window === 'undefined') return;

    console.log('AuthContext: Starting Twitch login');
    try {
      const response = await fetch('/api/auth/twitch', { method: 'GET' });
      if (response.ok) {
        const { url } = await response.json();
        console.log('AuthContext: Redirecting to Twitch auth URL:', url);
        window.location.href = url;
      } else {
        console.error('AuthContext: Failed to initiate Twitch login:', await response.text());
        throw new Error('Failed to initiate Twitch login');
      }
    } catch (error) {
      console.error('AuthContext: Error in Twitch login:', error);
      throw error;
    }
  };

  const logout = async () => {
    if (typeof window === 'undefined') return;

    console.log('AuthContext: Starting logout');
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });
    } catch (error) {
      console.error('AuthContext: Logout error:', error);
    } finally {
      console.log('AuthContext: Logout completed, clearing state');
      setCurrentUser(null);
      setIsAuthenticated(false);
      setIsStreamer(false);
      localStorage.clear();
      router.push('/auth');
    }
  };

  const switchProfile = (profileId) => {
    console.log('AuthContext: Switching profile to:', profileId);
    const profile = profiles.find(p => p.id === profileId);
    if (profile) {
      setCurrentUser(profile);
      setIsAuthenticated(true);
      setIsStreamer(profile.isStreamer);
      localStorage.setItem('user', JSON.stringify(profile));
      router.push('/profile');
    } else {
      console.error('AuthContext: Profile not found:', profileId);
    }
  };

  const value = {
    currentUser,
    isAuthenticated,
    isStreamer,
    profiles,
    loading,
    loginWithTwitch,
    logout,
    switchProfile,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};

module.exports = {
  AuthProvider,
  useAuth: () => {
    const context = React.useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    console.log('useAuth: Context value - isAuthenticated:', context.isAuthenticated);
    return context;
  }
};
