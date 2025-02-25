import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const TwitchAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    // Check if we're handling a callback from Twitch
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = localStorage.getItem('twitch_auth_state');

    if (code && state) {
      handleTwitchCallback(code, state, storedState);
    }
  }, []);

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleTwitchCallback = async (code, state, storedState) => {
    // Validate state to prevent CSRF attacks
    if (state !== storedState) {
      setError('Authentication failed: Invalid state parameter');
      return;
    }

    setLoading(true);
    try {
      // Exchange code for access token
      const response = await fetch('/api/auth/twitch/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error('Failed to authenticate with Twitch');
      }

      const data = await response.json();
      
      // Login with the user data
      await login(data);

      // Clear state from localStorage
      localStorage.removeItem('twitch_auth_state');
      
      // Redirect to home page
      navigate('/');
    } catch (err) {
      console.error('Authentication error:', err);
      setError(err.message || 'Failed to authenticate with Twitch');
    } finally {
      setLoading(false);
    }
  };

  const initiateLogin = () => {
    setLoading(true);
    
    try {
      // Generate a random state for CSRF protection
      const state = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('twitch_auth_state', state);
      
      // Redirect to Twitch auth page
      const clientId = process.env.TWITCH_CLIENT_ID;
      const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`);
      const scope = encodeURIComponent('user:read:email channel:read:subscriptions');
      
      const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;
      
      window.location.href = authUrl;
    } catch (err) {
      setError('Failed to initiate login process');
      setLoading(false);
    }
  };

  return (
    <div className="twitch-auth-container">
      <h2>Войти через Twitch</h2>
      {error && <div className="error-message">{error}</div>}
      <button 
        className="twitch-auth-button"
        onClick={initiateLogin}
        disabled={loading}
      >
        {loading ? 'Загрузка...' : 'Войти через Twitch'}
      </button>
      <p className="auth-note">
        Для регистрации как стример необходимо иметь минимум 265 подписчиков
      </p>
    </div>
  );
};

export default TwitchAuth;
