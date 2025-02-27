// src/components/TwitchAuth.js
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { getTelegramUser, setupMainButton } from '../utils/telegramInit';
import { motion } from 'framer-motion';

const TwitchAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nickname, setNickname] = useState('');
  const [telegramUser, setTelegramUser] = useState(null);
  const router = useRouter();
  const { login, profiles, switchProfile } = useAuth();

  useEffect(() => {
    // Check if running in Telegram and get user data
    const tgUser = getTelegramUser();
    if (tgUser) {
      setTelegramUser(tgUser);
      // Prefill nickname if Telegram username is available
      if (tgUser.username) {
        setNickname(tgUser.username);
      }
    }
    
    // Process URL parameters only on client side
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = localStorage.getItem('twitch_auth_state');
    const role = urlParams.get('role');
    const switchProfileParam = urlParams.get('switch');

    // Set up Telegram Main Button based on current state
    if (role === 'streamer' || role === 'subscriber') {
      setupMainButton('Connect Twitch', '#9146FF', '#FFFFFF', initiateLogin);
    }

    // Handle Twitch OAuth callback
    if (window.location.pathname === '/auth' && code && state && storedState && state === storedState) {
      handleTwitchCallback(code, role);
    }
  }, [router.query]);

  const handleTwitchCallback = async (code, role) => {
    setLoading(true);
    try {
      // Request to exchange code for token
      const response = await fetch('/api/auth/twitch/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Authentication error: ${response.status} - ${errorText}`);
      }

      const authData = await response.json();
      let userData = authData.user;

      // For subscriber role, add Telegram info and nickname
      if (role === 'subscriber') {
        if (!nickname) {
          throw new Error('Please enter your Twitch nickname');
        }
        
        userData = {
          id: userData.id,
          name: nickname || userData.name,
          isStreamer: false,
          followers: 0,
          subscriptions: [],
          telegramId: telegramUser?.id || null,
          telegramUsername: telegramUser?.username || null
        };
      } else if (role === 'streamer') {
        // For streamer role
        if (userData.followers < 265) {
          throw new Error('Not enough followers to register as a streamer (minimum 265 required)');
        }
        userData.isStreamer = true;
        userData.telegramId = telegramUser?.id || null;
        userData.telegramUsername = telegramUser?.username || null;
      }

      // Login and redirect
      await login({ user: userData, token: authData.token });
      localStorage.removeItem('twitch_auth_state');
      router.push('/profile');
    } catch (err) {
      setError(err.message);
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  const initiateLogin = () => {
    if (typeof window === 'undefined') return;
    
    setLoading(true);
    try {
      // Generate random state for OAuth security
      const state = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('twitch_auth_state', state);

      const clientId = process.env.TWITCH_CLIENT_ID;
      const redirectUri = encodeURIComponent(process.env.TWITCH_REDIRECT_URI || `${window.location.origin}/auth`);
      const role = new URLSearchParams(window.location.search).get('role');
      const scope = encodeURIComponent('user:read:email channel:read:subscriptions');

      if (role === 'subscriber') {
        if (!nickname) {
          setError('Please enter your Twitch nickname');
          setLoading(false);
          return;
        }
        window.location.href = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;
      } else if (role === 'streamer') {
        window.location.href = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;
      }
    } catch (err) {
      setError('Failed to start authentication process');
      console.error('Login initiation error:', err);
      setLoading(false);
    }
  };

  const handleNicknameChange = (e) => {
    setNickname(e.target.value);
    setError(null);
  };

  const role = new URLSearchParams(window.location.search).get('role') || new URLSearchParams(window.location.search).get('switch');
  const switchProfileParam = new URLSearchParams(window.location.search).get('switch');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="twitch-auth-container"
    >
      <h2>Connect with Twitch</h2>
      
      {telegramUser && (
        <div className="telegram-user-info">
          <p>Hello, {telegramUser.firstName} {telegramUser.lastName}</p>
        </div>
      )}
      
      {error && <div className="error-message">{error}</div>}
      
      {(!role || switchProfileParam === 'true') && profiles.length === 0 && (
        <div className="role-selection">
          <h3>Choose your role</h3>
          <button onClick={() => router.push('/auth?role=streamer')} className="role-btn">
            I'm a Streamer
          </button>
          <button onClick={() => router.push('/auth?role=subscriber')} className="role-btn">
            I'm a Subscriber
          </button>
        </div>
      )}
      
      {switchProfileParam === 'true' && profiles.length > 0 && (
        <div className="profile-selection">
          <h3>Select a profile</h3>
          {profiles.map((profile) => (
            <button 
              key={profile.id} 
              onClick={() => switchProfile(profile.id)}
              className="profile-switch-btn"
            >
              {profile.isStreamer ? `Streamer: ${profile.name}` : `Subscriber: ${profile.name}`}
            </button>
          ))}
        </div>
      )}
      
      {role === 'subscriber' && !localStorage.getItem('user') && (
        <div className="form-group">
          <label htmlFor="nickname">Your Twitch Nickname</label>
          <input
            id="nickname"
            type="text"
            className="input-field"
            placeholder="Enter your Twitch nickname"
            value={nickname}
            onChange={handleNicknameChange}
            disabled={loading}
          />
        </div>
      )}
      
      {(role === 'streamer' || role === 'subscriber') && !localStorage.getItem('user') && (
        <button 
          className="twitch-auth-button"
          onClick={initiateLogin}
          disabled={loading || (role === 'subscriber' && !nickname)}
        >
          {loading ? 'Connecting...' : 'Connect with Twitch'}
        </button>
      )}
      
      {role === 'streamer' && <p className="auth-note">You need at least 265 followers to register as a streamer</p>}
    </motion.div>
  );
};

export default TwitchAuth;
</document_content>
