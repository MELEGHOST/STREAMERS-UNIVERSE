'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import styles from './search.module.css';
import { getAccessTokenFromCookie } from '../utils/twitchAPI';

// Стили для кнопки поиска с uiverse.io
const searchButtonStyles = {
  searchBox: {
    display: 'flex',
    padding: '10px',
    alignItems: 'center',
    borderRadius: '50px',
    background: '#c7c7c72b',
    boxShadow: '0px 0px 20px rgba(0, 0, 0, 0.1)',
    maxWidth: '300px',
    margin: '20px auto',
  },
  searchInput: {
    padding: '10px',
    border: 'none',
    background: 'transparent',
    outline: 'none',
    color: 'white',
    width: '100%',
    fontSize: '16px',
  },
  searchBtn: {
    borderRadius: '50%',
    color: 'white',
    background: '#664cf8',
    borderWidth: '0',
    width: '37px',
    height: '37px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
  },
  searchIcon: {
    width: '20px',
    height: '20px',
    stroke: 'white',
  }
};

// Добавляем CSS для красивых чекбоксов
const checkboxStyles = {
  checkboxWrapper: {
    position: 'relative',
    marginBottom: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
  },
  checkbox: {
    position: 'absolute',
    opacity: '0',
    cursor: 'pointer',
    height: '0',
    width: '0',
  },
  checkmark: {
    position: 'relative',
    height: '1.5em',
    width: '1.5em',
    backgroundColor: 'transparent',
    borderRadius: '0.2em',
    transition: 'all 0.1s ease-in',
    marginRight: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #ffffffb0',
  },
  checkmarkActive: {
    backgroundColor: '#9146FF',
    border: '1px solid #9146FF',
  },
  checkmarkCheckIcon: {
    color: 'white',
    transform: 'scale(0)',
    transition: 'all 0.1s ease-in',
  },
  checkmarkCheckIconActive: {
    transform: 'scale(1)',
  },
  labelText: {
    color: '#fff',
    userSelect: 'none',
    cursor: 'pointer',
  }
};

// Компонент стилизованного чекбокса
const StyledCheckbox = ({ label, checked, onChange, name, value }) => {
  return (
    <label style={checkboxStyles.checkboxWrapper}>
      <input
        type="checkbox"
        style={checkboxStyles.checkbox}
        checked={checked}
        onChange={onChange}
        name={name}
        value={value}
      />
      <span 
        style={{
          ...checkboxStyles.checkmark,
          ...(checked ? checkboxStyles.checkmarkActive : {})
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          style={{
            ...checkboxStyles.checkmarkCheckIcon,
            ...(checked ? checkboxStyles.checkmarkCheckIconActive : {})
          }}
          width="14px"
          height="14px"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 12.75l6 6 9-13.5"
          />
        </svg>
      </span>
      <span style={checkboxStyles.labelText}>{label}</span>
    </label>
  );
};

export default function Search() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all',
    popularity: null,
    activity: null,
    region: null
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
      
      <div style={searchButtonStyles.searchBox}>
        <input 
          type="text" 
          placeholder="Поиск..." 
          style={searchButtonStyles.searchInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button 
          style={searchButtonStyles.searchBtn}
          onClick={handleSearch}
          disabled={loading}
        >
          <svg
            style={searchButtonStyles.searchIcon}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>
      </div>
      
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
              <StyledCheckbox
                label="Все"
                checked={filters.category === 'all'}
                onChange={() => setFilters({...filters, category: 'all'})}
                name="category"
                value="all"
              />
              <StyledCheckbox
                label="Стримеры"
                checked={filters.category === 'streamer'}
                onChange={() => setFilters({...filters, category: 'streamer'})}
                name="category"
                value="streamer"
              />
              <StyledCheckbox
                label="Зрители"
                checked={filters.category === 'viewer'}
                onChange={() => setFilters({...filters, category: 'viewer'})}
                name="category"
                value="viewer"
              />
            </div>
          </div>
          
          <div className={styles.filterGroup}>
            <h3>Статус</h3>
            <div className={styles.filterOptions}>
              <StyledCheckbox
                label="Все"
                checked={filters.status === 'all'}
                onChange={() => setFilters({...filters, status: 'all'})}
                name="status"
                value="all"
              />
              <StyledCheckbox
                label="Зарегистрированные"
                checked={filters.status === 'registered'}
                onChange={() => setFilters({...filters, status: 'registered'})}
                name="status"
                value="registered"
              />
              <StyledCheckbox
                label="Не зарегистрированные"
                checked={filters.status === 'not_registered'}
                onChange={() => setFilters({...filters, status: 'not_registered'})}
                name="status"
                value="not_registered"
              />
            </div>
          </div>
          
          <div className={styles.filterGroup}>
            <h3>Популярность</h3>
            <div className={styles.filterOptions}>
              <StyledCheckbox
                label="Популярные (1000+ фолловеров)"
                checked={filters.popularity === 'popular'}
                onChange={(e) => setFilters({...filters, 
                  popularity: e.target.checked ? 'popular' : null})}
                name="popularity"
                value="popular"
              />
              <StyledCheckbox
                label="Растущие каналы"
                checked={filters.popularity === 'rising'}
                onChange={(e) => setFilters({...filters, 
                  popularity: e.target.checked ? 'rising' : null})}
                name="popularity"
                value="rising"
              />
            </div>
          </div>
          
          <div className={styles.filterGroup}>
            <h3>Активность</h3>
            <div className={styles.filterOptions}>
              <StyledCheckbox
                label="Сейчас в эфире"
                checked={filters.activity === 'live'}
                onChange={(e) => setFilters({...filters, 
                  activity: e.target.checked ? 'live' : null})}
                name="activity"
                value="live"
              />
              <StyledCheckbox
                label="Недавно стримили"
                checked={filters.activity === 'recent'}
                onChange={(e) => setFilters({...filters, 
                  activity: e.target.checked ? 'recent' : null})}
                name="activity"
                value="recent"
              />
            </div>
          </div>
          
          <div className={styles.filterGroup}>
            <h3>Регион</h3>
            <div className={styles.filterOptions}>
              <StyledCheckbox
                label="Русскоговорящие"
                checked={filters.region === 'ru'}
                onChange={(e) => setFilters({...filters, 
                  region: e.target.checked ? 'ru' : null})}
                name="region"
                value="ru"
              />
              <StyledCheckbox
                label="Англоговорящие"
                checked={filters.region === 'en'}
                onChange={(e) => setFilters({...filters, 
                  region: e.target.checked ? 'en' : null})}
                name="region"
                value="en"
              />
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
                  status: 'all',
                  popularity: null,
                  activity: null,
                  region: null
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