'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

const TwitchAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;
    
    // Check if we're handling a callback from Twitch
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = localStorage.getItem('twitch_auth_state');

    if (code && state && storedState && state === storedState) {
      handleTwitchCallback(code);
    }
  }, []);

  const handleTwitchCallback = async (code) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/twitch/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) throw new Error('Ошибка авторизации через Twitch');

      const data = await response.json();
      await login(data);
      localStorage.removeItem('twitch_auth_state');
      router.push('/');
    } catch (err) {
      setError(err.message || 'Не удалось авторизоваться через Twitch');
    } finally {
      setLoading(false);
    }
  };

  const initiateLogin = () => {
    if (typeof window === 'undefined') return;
    
    setLoading(true);
    try {
      const state = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('twitch_auth_state', state);

      const clientId = process.env.TWITCH_CLIENT_ID;
      const redirectUri = encodeURIComponent(process.env.TWITCH_REDIRECT_URI || `${window.location.origin}/auth`);
      const scope = encodeURIComponent('user:read:email channel:read:subscriptions');

      window.location.href = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;
    } catch (err) {
      setError('Не удалось начать процесс авторизации');
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
