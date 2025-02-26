import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

const TwitchAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    // Выполняем на клиенте
    if (typeof window === 'undefined') return;
    
    // Проверяем, обрабатываем ли мы callback от Twitch
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = localStorage.getItem('twitch_auth_state');

    if (code && state) {
      handleTwitchCallback(code, state, storedState);
    }
  }, []);

  useEffect(() => {
    // Перенаправляем, если уже аутентифицированы
    if (typeof window === 'undefined') return;
    
    if (isAuthenticated) {
      router.push('/profile');
    }
  }, [isAuthenticated, router]);

  const handleTwitchCallback = async (code, state, storedState) => {
    // Валидируем state для предотвращения CSRF-атак
    if (state !== storedState) {
      setError('Ошибка аутентификации: неверный параметр state');
      return;
    }

    setLoading(true);
    try {
      // Для демонстрации мы просто симулируем успешную авторизацию
      // В реальном приложении здесь был бы запрос к API
      await login({
        user: {
          id: '123456789',
          name: 'ТестовыйСтример',
          followers: 300,
          isStreamer: true
        },
        token: 'demo_token_' + Math.random().toString(36).substring(2, 15)
      });

      // Очищаем состояние из localStorage
      localStorage.removeItem('twitch_auth_state');
      
      // Перенаправляем на страницу профиля
      router.push('/profile');
    } catch (err) {
      console.error('Ошибка аутентификации:', err);
      setError(err.message || 'Не удалось аутентифицироваться через Twitch');
    } finally {
      setLoading(false);
    }
  };

  const initiateLogin = () => {
    if (typeof window === 'undefined') return;
    
    setLoading(true);
    
    try {
      // Генерируем случайный state для защиты от CSRF
      const state = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('twitch_auth_state', state);
      
      // Для демонстрации мы имитируем успешную авторизацию сразу
      // В реальном приложении здесь был бы редирект на Twitch
      
      // Симулируем задержку и автоматический вход
      setTimeout(() => {
        login({
          user: {
            id: '123456789',
            name: 'ТестовыйСтример',
            followers: 300,
            isStreamer: true
          },
          token: 'demo_token_' + Math.random().toString(36).substring(2, 15)
        });
        router.push('/profile');
        setLoading(false);
      }, 1500);
    } catch (err) {
      setError('Не удалось инициировать процесс входа');
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
