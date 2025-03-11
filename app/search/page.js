'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import styles from './search.module.css';
import { getAccessTokenFromCookie } from '../utils/twitchAPI';
import SynthwaveButton from '../components/SynthwaveButton';
import SearchInput from '../components/SearchInput';

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
      <div
        style={{
          ...checkboxStyles.checkmark,
          ...(checked ? checkboxStyles.checkmarkActive : {})
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          width="1em"
          height="1em"
          style={{
            ...checkboxStyles.checkmarkCheckIcon,
            ...(checked ? checkboxStyles.checkmarkCheckIconActive : {})
          }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 12.75l6 6 9-13.5"
          />
        </svg>
      </div>
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
      
      // Безопасно получаем данные пользователя
      const getUserDataSafely = () => {
        if (typeof window === 'undefined') return;
        
        try {
          // Сначала пробуем через Cookies
          const cookieUser = Cookies.get('twitch_user');
          if (cookieUser) {
            const userData = JSON.parse(cookieUser);
            setUserId(userData.id || 'unknown');
            return;
          }
          
          // Затем пробуем через localStorage
          const storedUser = localStorage.getItem('twitch_user');
          if (storedUser) {
            const userData = JSON.parse(storedUser);
            setUserId(userData.id || 'unknown');
          }
        } catch (e) {
          console.error('Ошибка при обработке данных пользователя:', e);
          setUserId('unknown');
        }
      };
      
      getUserDataSafely();
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
    router.push(`/profile/${userId}`);
  };

  const goToMenu = () => {
    router.push('/menu');
  };

  const handleFollow = async (userId) => {
    if (!isAuthenticated) {
      alert('Пожалуйста, войдите в систему, чтобы подписаться на пользователя');
      return;
    }

    try {
      setLoading(true);
      // Отправляем запрос на API для подписки/отписки
      const response = await fetch(`/api/twitch/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          targetUserId: userId,
          action: results.isFollowed ? 'unfollow' : 'follow'
        }),
      });

      if (!response.ok) {
        throw new Error('Не удалось выполнить операцию');
      }

      // Обновляем состояние
      setResults({
        ...results,
        isFollowed: !results.isFollowed
      });

    } catch (error) {
      console.error('Ошибка при подписке/отписке:', error);
      alert(`Ошибка: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className={styles.searchContainer}>
      <h1>Поиск пользователя</h1>
      
      <SearchInput 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onSearch={handleSearch}
      />
      
      {loading && (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Поиск пользователя...</p>
        </div>
      )}
      
      {results && results.error && (
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>❌</div>
          <p>{results.error}</p>
          {results.filtered && (
            <button className={styles.resetFiltersButton} onClick={() => setFilters({
              category: 'all',
              status: 'all',
              popularity: null,
              activity: null,
              region: null
            })}>Сбросить фильтры</button>
          )}
        </div>
      )}
      
      {results && results.twitchData && !results.error && (
        <div className={styles.resultsContainer}>
          <div className={styles.userCard}>
            <div className={styles.userHeader}>
              <div className={styles.userAvatar}>
                <img src={results.twitchData.profile_image_url} alt={results.twitchData.display_name} />
              </div>
              <h2>{results.twitchData.display_name}</h2>
              {(results.twitchData.broadcaster_type || 
                (results.twitchData.follower_count && results.twitchData.follower_count >= 265)) && (
                <div className={styles.streamerBadge}>Стример</div>
              )}
            </div>
            <div className={styles.userStats}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Подписчики:</span>
                <span className={styles.statValue}>{results.twitchData.follower_count || 0}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Зарегистрирован:</span>
                <span className={styles.statValue}>
                  {new Date(results.twitchData.created_at).toLocaleDateString('ru-RU')}
                </span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Кол-во просмотров:</span>
                <span className={styles.statValue}>{results.twitchData.view_count || 0}</span>
              </div>
            </div>
            {results.twitchData.description && (
              <div className={styles.userDescription}>
                <h3>О пользователе:</h3>
                <p>{results.twitchData.description}</p>
              </div>
            )}
            {results.commonFollowers && results.commonFollowers.length > 0 && (
              <div className={styles.commonStreamers}>
                <h3>Общие стримеры ({results.commonFollowers.length}):</h3>
                <div className={styles.streamersList}>
                  {results.commonFollowers.slice(0, 5).map((streamer, index) => (
                    <div key={index} className={styles.commonStreamer}>
                      <img 
                        src={streamer.profile_image_url || '/images/default-avatar.png'} 
                        alt={streamer.display_name} 
                      />
                      <span>{streamer.display_name}</span>
                    </div>
                  ))}
                  {results.commonFollowers.length > 5 && (
                    <span>...и ещё {results.commonFollowers.length - 5}</span>
                  )}
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
              <button 
                className={styles.followButton}
                onClick={() => handleFollow(results.twitchData.id)}
                disabled={loading}
              >
                {results.isFollowed ? 'Отписаться' : 'Подписаться'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <button className={styles.backButton} onClick={goToMenu}>
        Вернуться в меню
      </button>

      {showFilters && (
        <div className={styles.filtersPanel}>
          <div className={styles.filterGroup}>
            <h3>Категория</h3>
            <div className={styles.filterOptions}>
              <div className={styles.filterOption}>
                <StyledCheckbox
                  label="Все"
                  checked={filters.category === 'all'}
                  onChange={() => setFilters({ ...filters, category: 'all' })}
                  name="category"
                  value="all"
                />
              </div>
              <div className={styles.filterOption}>
                <StyledCheckbox
                  label="Стримеры"
                  checked={filters.category === 'streamer'}
                  onChange={() => setFilters({ ...filters, category: 'streamer' })}
                  name="category"
                  value="streamer"
                />
              </div>
              <div className={styles.filterOption}>
                <StyledCheckbox
                  label="Зрители"
                  checked={filters.category === 'viewer'}
                  onChange={() => setFilters({ ...filters, category: 'viewer' })}
                  name="category"
                  value="viewer"
                />
              </div>
            </div>
          </div>
          <div className={styles.filterActions}>
            <button
              className={styles.applyFiltersButton}
              onClick={() => {
                if (results && results.twitchData) {
                  handleSearch();
                }
                setShowFilters(false);
              }}
            >
              Применить
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
              Сбросить
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 