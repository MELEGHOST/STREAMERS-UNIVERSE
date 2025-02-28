"use client";

const React = require('react');
const { useRouter } = require('next/router');
const axios = require('axios');
const moment = require('moment-timezone');

const AuthContext = React.createContext();

function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isStreamer, setIsStreamer] = React.useState(false);
  const [profiles, setProfiles] = React.useState([]);
  const [stars, setStars] = React.useState(0);
  const router = useRouter();

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkLoggedIn = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        const storedProfiles = JSON.parse(localStorage.getItem('profiles') || '[]');
        const storedStars = parseInt(localStorage.getItem('stars') || '0', 10);

        setProfiles(storedProfiles);
        setStars(storedStars);

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
            headers: { Authorization: `Bearer ${storedToken || ''}` },
          });

          if (response.ok) {
            const data = await response.json();
            setCurrentUser(data.user || null);
            setIsAuthenticated(data.isAuthenticated || false);
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
            setCurrentUser(null);
            setIsAuthenticated(false);
            setIsStreamer(false);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
          }
        } catch (serverError) {
          console.error('Server auth check failed:', serverError);
          if (!storedUser || !storedToken) {
            setCurrentUser(null);
            setIsAuthenticated(false);
            setIsStreamer(false);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
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
        const newProfiles = [...new Set([...profiles, { 
          id: data.user.id, 
          name: data.user.name, 
          isStreamer: data.user.isStreamer 
        }])];
        setProfiles(newProfiles);
        localStorage.setItem('profiles', JSON.stringify(newProfiles));
        router.push('/profile');
        return;
      }

      if (data.code) {
        const response = await fetch('/api/auth/twitch/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: data.code }),
        });

        if (!response.ok) {
          throw new Error(`Twitch auth failed: ${response.status}`);
        }

        const authData = await response.json();
        const twitchResponse = await axios.get(`https://api.twitch.tv/helix/users`, {
          headers: {
            'Client-ID': process.env.TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${authData.token}`,
          },
        });

        const user = twitchResponse.data.data[0];
        const followersResponse = await axios.get(`https://api.twitch.tv/helix/users/follows?to_id=${user.id}`, {
          headers: {
            'Client-ID': process.env.TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${authData.token}`,
          },
        });

        const followersCount = followersResponse.data.total || 0;
        let userData = {
          id: user.id,
          name: user.display_name,
          isStreamer: followersCount >= 265,
          followers: followersCount,
          subscriptions: [],
        };

        if (!userData.isStreamer) {
          const subsResponse = await axios.get(`https://api.twitch.tv/helix/subscriptions/user?broadcaster_id=${user.id}`, {
            headers: {
              'Client-ID': process.env.TWITCH_CLIENT_ID,
              'Authorization': `Bearer ${authData.token}`,
            },
          });
          userData.subscriptions = (subsResponse.data.data || []).map(sub => sub.broadcaster_name);
        }

        setCurrentUser(userData);
        setIsAuthenticated(true);
        setIsStreamer(userData.isStreamer);
        localStorage.setItem('token', authData.token);
        localStorage.setItem('user', JSON.stringify(userData));
        const newProfiles = [...new Set([...profiles, { 
          id: userData.id, 
          name: userData.name, 
          isStreamer: userData.isStreamer 
        }])];
        setProfiles(newProfiles);
        localStorage.setItem('profiles', JSON.stringify(newProfiles));
        router.push('/profile');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    if (typeof window === 'undefined') return;

    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setCurrentUser(null);
      setIsAuthenticated(false);
      setIsStreamer(false);
      localStorage.clear();
      router.push('/');
    }
  };

  const switchProfile = (profileId) => {
    const profile = profiles.find(p => p.id === profileId);
    if (profile) {
      setCurrentUser(profile);
      setIsAuthenticated(true);
      setIsStreamer(profile.isStreamer);
      localStorage.setItem('user', JSON.stringify(profile));
      router.push('/profile');
    } else {
      console.error('Profile not found:', profileId);
    }
  };

  const earnStars = (amount) => {
    const newStars = stars + amount;
    setStars(newStars);
    localStorage.setItem('stars', newStars);
  };

  const spendStars = (amount) => {
    if (stars >= amount) {
      const newStars = stars - amount;
      setStars(newStars);
      localStorage.setItem('stars', newStars);
      return true;
    }
    return false;
  };

  const getGreeting = () => {
    const userTimezone = moment.tz.guess();
    const now = moment.tz(userTimezone);
    const hour = now.hour();

    if (hour >= 5 && hour < 12) return 'Доброе утро';
    if (hour >= 12 && hour < 17) return 'Добрый день';
    if (hour >= 17 && hour < 22) return 'Добрый вечер';
    return 'Доброй ночи';
  };

  const value = {
    currentUser,
    isAuthenticated,
    isStreamer,
    profiles,
    loading,
    stars,
    login,
    logout,
    switchProfile,
    earnStars,
    spendStars,
    getGreeting,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};

module.exports = {
  AuthProvider,
  useAuth: () => {
    const context = React.useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
  }
};
