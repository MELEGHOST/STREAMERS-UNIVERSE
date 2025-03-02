"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../src/context/AuthContext';
import styles from './search.module.css';
import axios from 'axios';

export default function Search() {
  const { user, isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) window.location.href = '/auth';
  }, [isAuthenticated]);

  const handleSearch = async () => {
    if (!searchTerm) return;
    try {
      // Поиск пользователя Twitch по никнейму
      const twitchResponse = await axios.get(`https://api.twitch.tv/helix/users?login=${searchTerm}`, {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${localStorage.getItem('twitchToken')}`,
        },
      });
      const twitchUser = twitchResponse.data.data[0];

      // Проверка регистрации в приложении (из localStorage)
      const appUsers = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('twitchUser_')) {
          const storedUser = JSON.parse(localStorage.getItem(key));
          if (storedUser.name === searchTerm) {
            appUsers.push(storedUser);
          }
        }
      }

      // Проверка общих стримеров (упрощённо, из localStorage)
      const commonStreamers = [];
      if (twitchUser && user) {
        const userFollows = JSON.parse(localStorage.getItem(`follows_${user.id}`)) || [];
        const targetFollows = JSON.parse(localStorage.getItem(`follows_${twitchUser.id}`)) || [];
        commonStreamers = userFollows.filter(f => targetFollows.includes(f));
      }

      setResults({
        twitchData: twitchUser,
        isRegistered: appUsers.length > 0,
        followers: twitchUser?.follower_count || 0,
        commonStreamers,
      });
    } catch (error) {
      console.error('Search error:', error);
      setResults({ error: 'Не удалось найти пользователя' });
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className={styles.searchContainer}>
      <h1>Поиск пользователя</h1>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Введите ник Twitch"
        className={styles.input}
      />
      <button className={styles.button} onClick={handleSearch}>Поиск</button>
      {results && (
        <div className={styles.result}>
          {results.error && <p>{results.error}</p>}
          {results.twitchData && (
            <>
              <p>Ник: {results.twitchData.display_name}</p>
              <p>Зарегистрирован в приложении: {results.isRegistered ? 'Да' : 'Нет'}</p>
              <p>Фолловеры: {results.followers}</p>
              <p>Общие стримеры: {results.commonStreamers.join(', ') || 'Нет общих'}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
