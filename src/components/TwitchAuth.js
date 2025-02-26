import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

const TwitchAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;
    
    // Check if we're handling a callback from Twitch
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = localStorage.getItem('twitch_auth_state');

    if (code && state) {
      handleTwitchCallback(code, state, storedState);
    }
    
    // Redirect if already authenticated
    if (isAuthenticated) {
      router.push('/profile');
    }
  }, [isAuthenticated, router]);

  const handleTwitchCallback = async (code, state, storedState) => {
    // Validate state to prevent CSRF attacks
    if (state !== storedState) {
      setError('Authentication error: invalid state parameter');
      return;
    }

    setLoading(true);
    try {
      // For demo purposes, we're simulating successful authentication
      await login({
        user: {
          id: '123456789',
          name: 'TestStreamer',
          followers: 300,
          isStreamer: true
        },
        token: 'demo_token_' + Math.random().toString(36).substring(2, 15)
      });

      // Clear state from localStorage
      localStorage.removeItem('twitch_auth_state');
      
      // Redirect to profile page
      router.push('/profile');
    } catch (err) {
      console.error('Authentication error:', err);
      setError(err.message || 'Failed to authenticate with Twitch');
    } finally {
      setLoading(false);
    }
  };

  const initiateLogin = () => {
    if (typeof window === 'undefined') return;
    
    setLoading(true);
    
    try {
      // Generate random state for CSRF protection
      const state = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('twitch_auth_state', state);
      
      // For demo, simulate successful auth immediately
      // In a real app, this would redirect to Twitch
      
      // Simulate delay and auto-login
      setTimeout(() => {
        login({
          user: {
            id: '123456789',
            name: 'TestStreamer',
            followers: 300,
            isStreamer: true
          },
          token: 'demo_token_' + Math.random().toString(36).substring(2, 15)
        });
        router.push('/profile');
        setLoading(false);
      }, 1500);
    } catch (err) {
      setError('Failed to initiate login process');
      setLoading(false);
    }
  };

  return (
    <div className="twitch-auth-container">
      <h2>Login with Twitch</h2>
      {error && <div className="error-message">{error}</div>}
      <button 
        className="twitch-auth-button"
        onClick={initiateLogin}
        disabled={loading}
      >
        {loading ? 'Loading...' : 'Login with Twitch'}
      </button>
      <p className="auth-note">
        To register as a streamer, you need at least 265 followers
      </p>
    </div>
  );
};

export default TwitchAuth;
