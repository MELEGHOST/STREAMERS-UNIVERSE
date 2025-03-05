"use client";

import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import styles from './search.module.css';
import axios from 'axios';

export default function Search() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState(null);

  useEffect(() => {
    const accessToken = Cookies.get('twitch_access_token');
    if (!accessToken) {
      window.location.href = '/auth';
    } else {
      setIsAuthenticated(true);
      const storedUser = JSON.parse(localStorage.getItem('twitch_user') || '{}');
      setUserId(storedUser.id || 'unknown');
    }
  }, []);

  const handleSearch = async () => {
    if (!searchTerm) return;
    try {
      const accessToken = Cookies.get('twitch_access_token');
      const twitchResponse = await axios.get(`https://api.twitch.tv/helix/users?login=${searchTerm}`, {
        headers: {
          'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID, // Используем публичную переменную
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      const twitchUser = twitchResponse.data.data[0];

      const appUsers = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('twitchUser_')) {
          const storedUser = JSON.parse(localStorage.getItem(key));
          if (storedUser.name === searchTerm) {
            appUsers.push(storedUser);
          }
        }
      }

      const commonStreamers = [];
      if (twitchUser && userId) {
        const userFollows = JSON.parse(localStorage.getItem(`follows_${userId}`)) || [];
        const targetFollows = JSON.parse(localStorage.getItem(`follows_${twitchUser.id}`)) || [];
        commonStreamers.push(...userFollows.filter(f => targetFollows.includes(f)));
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

export async function getStaticProps() {
  return {
    props: {}, // Нет данных для prerendering, всё загружается на клиенте
  };
}
