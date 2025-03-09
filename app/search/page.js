'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import styles from './search.module.css';
import { getAccessTokenFromCookie } from '../utils/twitchAPI';

export default function Search() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all'
  });
  const router = useRouter();

  useEffect(() => {
    const accessToken = getAccessTokenFromCookie();
    if (!accessToken) {
      router.push('/auth');
    } else {
      setIsAuthenticated(true);
      try {
        const storedUser = JSON.parse(localStorage.getItem('twitch_user') || '{}');
        setUserId(storedUser.id || 'unknown');
      } catch (e) {
        console.error('Ошибка при обработке данных пользователя:', e);
      }
    }
  }, [router]);

  const handleSearch = async () => {
    if (!searchTerm) return;
    
    setLoading(true);
    setResults(null);
    
    try {
      const accessToken = getAccessTokenFromCookie();
      
      if (!accessToken) {
        throw new Error('Не авторизован. Пожалуйста, войдите в систему.');
      }
      
      const sanitizedSearchTerm = searchTerm.trim().toLowerCase();
      
      if (!sanitizedSearchTerm) {
        throw new Error('Пожалуйста, введите корректный запрос для поиска');
      }
      
      const response = await fetch(`/api/twitch/search?login=${encodeURIComponent(sanitizedSearchTerm)}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          setResults({ error: 'Пользователь не найден на Twitch' });
        } else {
          let errorMessage = 'Ошибка поиска';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (jsonError) {
            console.error('Ошибка при обработке ответа сервера:', jsonError);
          }
          throw new Error(errorMessage);
        }
        setLoading(false);
        return;
      }
      
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        throw new Error('Не удалось обработать ответ от сервера');
      }
      
      if (!data.twitchData) {
        setResults({ error: 'Пользователь не найден на Twitch' });
      } else {
        let filteredResults = { ...data };
        
        if (filters.category === 'streamer' && 
            !(data.twitchData.broadcaster_type || 
             (data.twitchData.follower_count && data.twitchData.follower_count >= 265))) {
          filteredResults = { filtered: true, error: 'Нет результатов, соответствующих фильтрам' };
        } else if (filters.category === 'viewer' && 
                  (data.twitchData.broadcaster_type || 
                  (data.twitchData.follower_count && data.twitchData.follower_count >= 265))) {
          filteredResults = { filtered: true, error: 'Нет результатов, соответствующих фильтрам' };
        }
        
        setResults(filteredResults);
      }
    } catch (error) {
      console.error('Ошибка поиска:', error);
      setResults({ error: error.message || 'Произошла ошибка при поиске пользователя' });
    } finally {
      setLoading(false);
    }
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const goToUserProfile = (userId) => {
    router.push(`/user/${userId}`);
  };

  const goToMenu = () => {
    router.push('/menu');
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
            placeholder="Поиск..." 
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
          <div id={styles.filterIcon} onClick={toggleFilters}>
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
                strokeWidth="1"
                strokeMiterlimit="10"
                strokeLinecap="round"
                strokeLinejoin="round"
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
      
      {showFilters && (
        <div className={styles.filtersPanel}>
          <div className={styles.filterGroup}>
            <h3>Категория</h3>
            <div className={styles.filterOptions}>
              <label className={styles.filterOption}>
                <input 
                  type="radio" 
                  name="category" 
                  value="all" 
                  checked={filters.category === 'all'} 
                  onChange={() => setFilters({...filters, category: 'all'})}
                />
                <span>Все</span>
              </label>
              <label className={styles.filterOption}>
                <input 
                  type="radio" 
                  name="category" 
                  value="streamer" 
                  checked={filters.category === 'streamer'} 
                  onChange={() => setFilters({...filters, category: 'streamer'})}
                />
                <span>Стримеры</span>
              </label>
              <label className={styles.filterOption}>
                <input 
                  type="radio" 
                  name="category" 
                  value="viewer" 
                  checked={filters.category === 'viewer'} 
                  onChange={() => setFilters({...filters, category: 'viewer'})}
                />
                <span>Зрители</span>
              </label>
            </div>
          </div>
          
          <div className={styles.filterGroup}>
            <h3>Статус</h3>
            <div className={styles.filterOptions}>
              <label className={styles.filterOption}>
                <input 
                  type="radio" 
                  name="status" 
                  value="all" 
                  checked={filters.status === 'all'} 
                  onChange={() => setFilters({...filters, status: 'all'})}
                />
                <span>Все</span>
              </label>
              <label className={styles.filterOption}>
                <input 
                  type="radio" 
                  name="status" 
                  value="registered" 
                  checked={filters.status === 'registered'} 
                  onChange={() => setFilters({...filters, status: 'registered'})}
                />
                <span>Зарегистрированные</span>
              </label>
              <label className={styles.filterOption}>
                <input 
                  type="radio" 
                  name="status" 
                  value="not_registered" 
                  checked={filters.status === 'not_registered'} 
                  onChange={() => setFilters({...filters, status: 'not_registered'})}
                />
                <span>Не зарегистрированные</span>
              </label>
            </div>
          </div>
          
          <div className={styles.filterActions}>
            <button 
              className={styles.applyFiltersButton}
              onClick={() => {
                handleSearch();
                setShowFilters(false);
              }}
            >
              Применить фильтры
            </button>
            <button 
              className={styles.resetFiltersButton}
              onClick={() => {
                setFilters({
                  category: 'all',
                  status: 'all'
                });
              }}
            >
              Сбросить фильтры
            </button>
          </div>
        </div>
      )}
      
      <div className={styles.resultsContainer}>
        {loading && (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>Поиск пользователя...</p>
          </div>
        )}
        
        {!loading && results && results.error && (
          <div className={styles.errorContainer}>
            <div className={styles.errorIcon}>⚠️</div>
            <h3>Ошибка поиска</h3>
            <p>{results.error}</p>
          </div>
        )}
        
        {!loading && results && !results.error && results.twitchData && (
          <div className={styles.userCard}>
            <div className={styles.userHeader}>
              <img 
                src={results.twitchData.profile_image_url} 
                alt={results.twitchData.display_name}
                className={styles.userAvatar}
              />
              <h2>{results.twitchData.display_name}</h2>
              {results.isStreamer && <div className={styles.streamerBadge}>Стример</div>}
            </div>
            
            <div className={styles.userStats}>
              <div className={styles.statItem}>
                <div className={styles.statLabel}>Фолловеры</div>
                <div className={styles.statValue}>{results.twitchData.follower_count?.toLocaleString() || 'N/A'}</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statLabel}>Фолловинги</div>
                <div className={styles.statValue}>{results.twitchData.following_count?.toLocaleString() || 'N/A'}</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statLabel}>Просмотры</div>
                <div className={styles.statValue}>{results.twitchData.view_count?.toLocaleString() || 'N/A'}</div>
              </div>
            </div>
            
            {results.twitchData.description && (
              <div className={styles.userDescription}>
                <h3>О пользователе</h3>
                <p>{results.twitchData.description}</p>
              </div>
            )}
            
            {results.commonStreamers && results.commonStreamers.length > 0 && (
              <div className={styles.commonStreamers}>
                <h3>Общие подписки ({results.commonStreamers.length})</h3>
                <div className={styles.streamersList}>
                  {results.commonStreamers.map((streamer, index) => (
                    <div key={index} className={styles.commonStreamer}>{streamer}</div>
                  ))}
                </div>
              </div>
            )}
            
            <div className={styles.userActions}>
              <button 
                className={styles.viewProfileButton}
                onClick={() => goToUserProfile(results.twitchData.id)}
              >
                Просмотреть профиль
              </button>
              {results.isRegisteredInSU && (
                <button className={styles.followButton}>
                  {results.isFollowed ? 'Отписаться' : 'Подписаться'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      
      <button 
        className={styles.backButton}
        onClick={goToMenu}
      >
        Вернуться в меню
      </button>
    </div>
  );
} 