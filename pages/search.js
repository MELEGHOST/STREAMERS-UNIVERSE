"use client";

import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import styles from './search.module.css';
import { useRouter } from 'next/router';

export default function Search() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const accessToken = Cookies.get('twitch_access_token');
    if (!accessToken) {
      router.push('/auth');
    } else {
      setIsAuthenticated(true);
      try {
        const storedUser = JSON.parse(localStorage.getItem('twitch_user') || '{}');
        setUserId(storedUser.id || 'unknown');
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }
  }, [router]);

  const handleSearch = async () => {
    if (!searchTerm) return;
    
    setLoading(true);
    setResults(null);
    
    try {
      const accessToken = Cookies.get('twitch_access_token');
      
      // Make search request through our own API to avoid exposing credentials
      const response = await fetch(`/api/twitch/search?login=${encodeURIComponent(searchTerm)}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 404) {
          setResults({ error: 'Пользователь не найден на Twitch' });
        } else {
          throw new Error(data.error || 'Ошибка поиска');
        }
      } else if (!data.twitchData) {
        setResults({ error: 'Пользователь не найден на Twitch' });
      } else {
        setResults(data);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults({ error: error.message || 'Произошла ошибка при поиске пользователя' });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className={styles.searchContainer}>
      <h1>Поиск пользователя</h1>
      <div className={styles.searchBox}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Введите никнейм Twitch"
          className={styles.input}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button 
          className={styles.button} 
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? 'Поиск...' : 'Найти'}
        </button>
      </div>
      
      {results && (
        <div className={styles.result}>
          {results.error && <p className={styles.error}>{results.error}</p>}
          {results.twitchData && (
            <div className={styles.userCard}>
              <div className={styles.userHeader}>
                {results.twitchData.profile_image_url && (
                  <img 
                    src={results.twitchData.profile_image_url} 
                    alt={`${results.twitchData.display_name} аватар`} 
                    className={styles.userAvatar}
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%237B41C9"%3E%3C/rect%3E%3Ctext x="100" y="100" font-family="Arial" font-size="24" text-anchor="middle" fill="white"%3ENo Image%3C/text%3E%3C/svg%3E';
                    }}
                  />
                )}
                <h2>{results.twitchData.display_name}</h2>
              </div>
              
              <div className={styles.userInfo}>
                <p><strong>Зарегистрирован в Streamers Universe:</strong> 
                  {results.isRegisteredInSU ? 
                    <span className={styles.registeredBadge}>Да</span> : 
                    <span className={styles.notRegisteredBadge}>Нет</span>
                  }
                </p>
                <p><strong>Фолловеров на Twitch:</strong> {results.followers}</p>
                {results.commonStreamers?.length > 0 && (
                  <div>
                    <p><strong>Общие стримеры:</strong></p>
                    <ul className={styles.commonStreamersList}>
                      {results.commonStreamers.map((streamer, index) => (
                        <li key={index}>{streamer}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className={styles.actionButtons}>
        <button className={styles.button} onClick={() => router.push('/menu')}>
          Вернуться в меню
        </button>
      </div>
    </div>
  );
}
