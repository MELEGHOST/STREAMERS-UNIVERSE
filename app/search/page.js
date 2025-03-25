'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import styles from './search.module.css';
import { getAccessTokenFromCookie } from '../utils/twitchAPI';
import SynthwaveButton from '../components/SynthwaveButton';
import Input from '../components/Input';
import NeonCheckbox from '../components/NeonCheckbox';

export default function Search() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all',
    popularity: null,
    activity: null,
    region: null
  });

  // Проверка авторизации
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Проверяем все возможные источники данных авторизации
        const accessToken = Cookies.get('twitch_access_token');
        const userDataCookie = Cookies.get('twitch_user') || Cookies.get('twitch_user_data');
        const localStorageAuth = localStorage.getItem('is_authenticated') === 'true';
        const localStorageUser = localStorage.getItem('twitch_user');
        
        // Устанавливаем куку для middleware, чтобы указать, что у нас есть данные в localStorage
        if (localStorageUser) {
          Cookies.set('has_local_storage_token', 'true', { 
            expires: 1, // 1 день
            path: '/',
            sameSite: 'lax'
          });
          console.log('Установлена кука has_local_storage_token для middleware');
        }
        
        const isAuth = accessToken || userDataCookie || localStorageAuth || localStorageUser;
        
        if (!isAuth) {
          console.log('Пользователь не авторизован, перенаправляем на страницу авторизации');
          router.push('/auth');
          return;
        }
        
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Ошибка при проверке авторизации:', error);
        router.push('/auth');
      }
    };
    
    checkAuth();
  }, [router]);

  const handleSearch = async () => {
    if (!query) return;
    
    setLoading(true);
    setResults(null);
    
    try {
      const accessToken = getAccessTokenFromCookie();
      
      if (!accessToken) {
        console.warn('Поиск без авторизации. Перенаправление на страницу авторизации.');
        router.push('/auth');
        return;
      }
      
      const sanitizedQuery = query.trim().toLowerCase();
      
      if (!sanitizedQuery) {
        throw new Error('Пожалуйста, введите корректный запрос для поиска');
      }
      
      const response = await fetch(`/api/twitch/search?login=${encodeURIComponent(sanitizedQuery)}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('Ошибка авторизации при поиске. Перенаправление на страницу авторизации.');
          // Очищаем токен, так как он недействителен
          document.cookie = 'twitch_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          router.push('/auth');
          return;
        }
        
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

  const applyFilters = () => {
    if (!results || !results.twitchData) return;
    
    let filteredResults = { ...results };
    
    if (filters.category === 'streamer' && 
        !(results.twitchData.broadcaster_type || 
         (results.twitchData.follower_count && results.twitchData.follower_count >= 265))) {
      filteredResults = { filtered: true, error: 'Нет результатов, соответствующих фильтрам' };
    } else if (filters.category === 'viewer' && 
              (results.twitchData.broadcaster_type || 
              (results.twitchData.follower_count && results.twitchData.follower_count >= 265))) {
      filteredResults = { filtered: true, error: 'Нет результатов, соответствующих фильтрам' };
    }
    
    setResults(filteredResults);
    setShowFilters(false);
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
      
      <div className={styles.searchInputContainer}>
        <Input 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onSearch={handleSearch}
          placeholder="Введите никнейм с Twitch..."
        />
        <button 
          className={styles.filtersButton} 
          onClick={toggleFilters}
          title="Открыть фильтры"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 3H2L10 12.46V19L14 21V12.46L22 3Z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
      
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
                <NeonCheckbox
                  label="Все"
                  checked={filters.category === 'all'}
                  onChange={() => setFilters({ ...filters, category: 'all' })}
                  name="category"
                  value="all"
                />
              </div>
              <div className={styles.filterOption}>
                <NeonCheckbox
                  label="Стримеры"
                  checked={filters.category === 'streamer'}
                  onChange={() => setFilters({ ...filters, category: 'streamer' })}
                  name="category"
                  value="streamer"
                />
              </div>
              <div className={styles.filterOption}>
                <NeonCheckbox
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
              onClick={applyFilters}
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