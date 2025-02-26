// Компонент для авторизации через Twitch
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

const TwitchAuth = () => {
  // Состояния для управления загрузкой, ошибками и никнеймом
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nickname, setNickname] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    // Выполняется только на стороне клиента
    if (typeof window === 'undefined') return;
    
    // Проверяем, обрабатываем ли мы callback от Twitch на /auth
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = localStorage.getItem('twitch_auth_state');
    const role = urlParams.get('role');
    const switchProfile = urlParams.get('switch');

    console.log('Callback params on /auth:', { 
      code, 
      state, 
      storedState, 
      role, 
      switchProfile, 
      pathname: window.location.pathname, 
      fullURL: window.location.href 
    }); // Отладка

    if (window.location.pathname === '/auth' && code && state && storedState && state === storedState) {
      handleTwitchCallback(code, role);
    }

    // Обрабатываем смену профиля или выбор роли
    if (switchProfile === 'true' || !localStorage.getItem('user')) {
      if (role === 'subscriber') {
        setNickname('');
      }
    }
  }, []);

  const handleTwitchCallback = async (code, role) => {
    // Начинаем загрузку
    setLoading(true);
    try {
      // Запрос к серверному маршруту для обмена кода на токен
      const response = await fetch('/api/auth/twitch/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      console.log('Twitch callback response:', { 
        status: response.status, 
        statusText: response.statusText, 
        ok: response.ok 
      }); // Отладка

      // Проверяем, успешен ли ответ
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка авторизации через Twitch: ${response.status} - ${errorText}`);
      }

      const authData = await response.json();
      let userData = authData.user;

      // Обработка роли "подписчик": запрашиваем только никнейм из ввода или реальный никнейм из Twitch
      if (role === 'subscriber') {
        userData = {
          id: userData.id,
          name: nickname || userData.name, // Используем введённый никнейм или реальный из Twitch
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
          userData.subscriptions = []; // Устанавливаем пустой массив, если ошибка
          console.log('Subscriptions error:', { 
            status: subscriptionsResponse.status, 
            statusText: subscriptionsResponse.statusText 
          }); // Отладка
        }
      } else if (role === 'streamer') {
        // Используем реальный никнейм и данные из Twitch
        userData.isStreamer = true;
        if (userData.followers < 265) {
          throw new Error('Недостаточно подписчиков для регистрации как стример (требуется минимум 265)');
        }
      }

      console.log('User data after auth:', userData); // Отладка

      // Выполняем вход и перенаправляем на профиль
      await login({ user: userData, token: authData.token });
      localStorage.removeItem('twitch_auth_state');
      router.push('/profile'); // Перенаправляем на профиль после авторизации
    } catch (err) {
      setError(err.message);
      console.error('Auth error:', err); // Отладка
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
      const role = new URLSearchParams(window.location.search).get('role');
      const scope = encodeURIComponent('user:read:email channel:read:subscriptions');

      console.log('Initiating login with:', { role, clientId, redirectUri }); // Отладка

      if (role === 'subscriber') {
        if (!nickname) {
          setError('Пожалуйста, введите ваш никнейм Twitch');
          setLoading(false);
          return;
        }
        window.location.href = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;
      } else if (role === 'streamer') {
        window.location.href = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;
      }
    } catch (err) {
      setError('Не удалось начать процесс авторизации');
      console.error('Login initiation error:', err); // Отладка
      setLoading(false);
    }
  };

  const handleNicknameChange = (e) => {
    setNickname(e.target.value);
    setError(null);
  };

  const role = new URLSearchParams(window.location.search).get('role') || new URLSearchParams(window.location.search).get('switch');

  return (
    <div className="twitch-auth-container">
      <h2>Войти через Twitch</h2>
      {error && <div className="error-message">{error}</div>}
      {role === 'subscriber' && !localStorage.getItem('user') && (
        <input
          type="text"
          className="input-field"
          placeholder="Ваш никнейм Twitch"
          value={nickname}
          onChange={handleNicknameChange}
          disabled={loading}
        />
      )}
      <button 
        className="twitch-auth-button"
        onClick={initiateLogin}
        disabled={loading || (role === 'subscriber' && !nickname)}
      >
        {loading ? 'Загрузка...' : 'Войти через Twitch'}
      </button>
      {role === 'streamer' && <p className="auth-note">Для регистрации как стример необходимо иметь минимум 265 подписчиков</p>}
    </div>
  );
};

export default TwitchAuth;
