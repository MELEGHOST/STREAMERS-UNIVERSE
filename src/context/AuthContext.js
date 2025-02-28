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

    console.log('AuthContext: Starting checkLoggedIn');
    const checkLoggedIn = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        const storedProfiles = JSON.parse(localStorage.getItem('profiles') || '[]');
        const storedStars = parseInt(localStorage.getItem('stars') || '0', 10);

        console.log('AuthContext: Stored data - User:', storedUser, 'Token:', storedToken, 'Profiles:', storedProfiles, 'Stars:', storedStars);

        setProfiles(storedProfiles);
        setStars(storedStars);

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

  const login = async (data) => {
    if (typeof window === 'undefined') return;

    console.log('AuthContext: Starting login with data:', data);
    try {
      if (data.user) {
        console.log('AuthContext: Logging in with user data:', data.user);
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
        console.log('AuthContext: Exchanging Twitch code for token:', data.code);
        const response = await fetch('/api/auth/twitch/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: data.code }),
        });

        console.log('AuthContext: Twitch callback response - Status:', response.status, 'OK:', response.ok);

        if (!response.ok) {
          throw new Error(`Twitch auth failed: ${response.status}`);
        }

        const authData = await response.json();
        console.log('AuthContext: Auth data from Twitch:', authData);

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

        console.log('AuthContext: User data after login:', userData);
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
      console.error('AuthContext: Login error:', error);
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
      router.push('/');
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
    console.log('useAuth: Context value - isAuthenticated:', context.isAuthenticated, 'Stars:', context.stars);
    return context;
  }
};
