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
    
    // Проверяем, обрабатываем ли мы callback от Twitch
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = localStorage.getItem('twitch_auth_state');
    const role = urlParams.get('role');
    const switchProfile = urlParams.get('switch');

    if (code && state && storedState && state === storedState) {
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

      // Проверяем, успешен ли ответ
      if (!response.ok) throw new Error('Ошибка авторизации через Twitch');

      const authData = await response.json();
      let userData = authData.user;

      // Обработка роли "подписчик": запрашиваем только никнейм и подписки
      if (role === 'subscriber') {
        if (!nickname) {
          throw new Error('Пожалуйста, введите ваш никнейм Twitch');
        }
        userData = {
          id: authData.user.id,
          name: nickname, // Используем введённый никнейм
          isStreamer: false,
          followers: 0,
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
        }
      } else if (role === 'streamer') {
        // Проверяем количество подписчиков для стримера
        if (userData.followers < 265) {
          throw new Error('Недостаточно подписчиков для регистрации как стример (требуется минимум 265)');
        }
        userData.isStreamer = true;
      }

      // Выполняем вход и перенаправляем на профиль
      await login({ user: userData, token: authData.token });
      localStorage.removeItem('twitch_auth_state');
      router.push('/profile'); // Перенаправляем на профиль после авторизации
    } catch (err) {
      setError(err.message);
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
