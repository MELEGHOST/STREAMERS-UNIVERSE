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
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
      setResults({ error: 'Could not find user' });
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
            <>
              <p>Никнейм: {results.twitchData.display_name}</p>
              <p>Зарегистрирован в приложении: {results.isRegistered ? 'Да' : 'Нет'}</p>
              <p>Подписчиков: {results.followers}</p>
              <p>Общие стримеры: {results.commonStreamers?.length > 0 ? 
                results.commonStreamers.join(', ') : 'Нет'}
              </p>
            </>
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
