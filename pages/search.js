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
      
      <div className={styles.grid}></div>
      <div id={styles.poda}>
        <div className={styles.glow}></div>
        <div className={styles.darkBorderBg}></div>
        <div className={styles.darkBorderBg}></div>
        <div className={styles.darkBorderBg}></div>

        <div className={styles.white}></div>

        <div className={styles.border}></div>

        <div id={styles.main}>
          <input 
            placeholder="Search..." 
            type="text" 
            name="text" 
            className={styles.input}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <div id={styles.inputMask}></div>
          <div id={styles.pinkMask}></div>
          <div className={styles.filterBorder}></div>
          <div id={styles.filterIcon}>
            <svg
              preserveAspectRatio="none"
              height="27"
              width="27"
              viewBox="4.8 4.56 14.832 15.408"
              fill="none"
            >
              <path
                d="M8.16 6.65002H15.83C16.47 6.65002 16.99 7.17002 16.99 7.81002V9.09002C16.99 9.56002 16.7 10.14 16.41 10.43L13.91 12.64C13.56 12.93 13.33 13.51 13.33 13.98V16.48C13.33 16.83 13.1 17.29 12.81 17.47L12 17.98C11.24 18.45 10.2 17.92 10.2 16.99V13.91C10.2 13.5 9.97 12.98 9.73 12.69L7.52 10.36C7.23 10.08 7 9.55002 7 9.20002V7.87002C7 7.17002 7.52 6.65002 8.16 6.65002Z"
                stroke="#d6d6e6"
                stroke-width="1"
                stroke-miterlimit="10"
                stroke-linecap="round"
                stroke-linejoin="round"
              ></path>
            </svg>
          </div>
          <div id={styles.searchIcon} onClick={handleSearch}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              viewBox="0 0 24 24"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              height="24"
              fill="none"
              className={styles.featherSearch}
            >
              <circle stroke="url(#search)" r="8" cy="11" cx="11"></circle>
              <line
                stroke="url(#searchl)"
                y2="16.65"
                y1="22"
                x2="16.65"
                x1="22"
              ></line>
              <defs>
                <linearGradient gradientTransform="rotate(50)" id="search">
                  <stop stopColor="#f8e7f8" offset="0%"></stop>
                  <stop stopColor="#b6a9b7" offset="50%"></stop>
                </linearGradient>
                <linearGradient id="searchl">
                  <stop stopColor="#b6a9b7" offset="0%"></stop>
                  <stop stopColor="#837484" offset="50%"></stop>
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>
      
      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Поиск пользователя...</p>
        </div>
      )}
      
      <div className={styles.actionButtons}>
        <button 
          className={styles.button} 
          onClick={() => router.push('/menu')}
        >
          Вернуться в меню
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
    </div>
  );
}
