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
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all'
  });
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

  const toggleFilters = () => {
    setShowFilters(!showFilters);
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
      
      {/* Фильтры поиска */}
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
                // Применение фильтров
                handleSearch();
                setShowFilters(false);
              }}
            >
              Применить фильтры
            </button>
            <button 
              className={styles.resetFiltersButton}
              onClick={() => {
                setFilters({category: 'all', status: 'all'});
              }}
            >
              Сбросить
            </button>
          </div>
        </div>
      )}
      
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
                <div>
                  <h2>
                    {results.twitchData.display_name}
                    <span className={`${styles.userStatus} ${results.isStreamer ? styles.streamerStatus : styles.viewerStatus}`}>
                      {results.isStreamer ? 'Стример' : 'Зритель'}
                    </span>
                  </h2>
                </div>
              </div>
              
              <div className={styles.userInfo}>
                <p><strong>Зарегистрирован в Streamers Universe:</strong> 
                  {results.isRegisteredInSU ? 
                    <span className={styles.registeredBadge}>Да</span> : 
                    <span className={styles.notRegisteredBadge}>Нет</span>
                  }
                </p>
                <div className={styles.userStats}>
                  <div className={styles.statItem}>
                    <span className={styles.statValue}>{results.twitchData.follower_count || 0}</span>
                    <span className={styles.statLabel}>Фолловеров Twitch</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statValue}>{results.twitchData.following_count || 0}</span>
                    <span className={styles.statLabel}>Фолловингов Twitch</span>
                  </div>
                  {results.twitchData.broadcaster_type && (
                    <div className={styles.statItem}>
                      <span className={styles.statValue}>{results.twitchData.view_count || 0}</span>
                      <span className={styles.statLabel}>Просмотров</span>
                    </div>
                  )}
                </div>
                
                {results.socialLinks && (
                  <div className={styles.socialLinks}>
                    {results.socialLinks.twitch && (
                      <a 
                        href={results.socialLinks.twitch} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={styles.socialLink}
                        title="Twitch"
                      >
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="#9146FF">
                          <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
                        </svg>
                      </a>
                    )}
                    
                    {results.socialLinks.youtube && (
                      <a 
                        href={results.socialLinks.youtube} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={styles.socialLink}
                        title="YouTube"
                      >
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="#FF0000">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                      </a>
                    )}
                    
                    {results.socialLinks.discord && (
                      <a 
                        href={results.socialLinks.discord} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={styles.socialLink}
                        title="Discord"
                      >
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="#5865F2">
                          <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
                        </svg>
                      </a>
                    )}
                    
                    {results.socialLinks.telegram && (
                      <a 
                        href={results.socialLinks.telegram} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={styles.socialLink}
                        title="Telegram"
                      >
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="#0088cc">
                          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.269c-.145.658-.537.818-1.084.51l-3-2.21-1.446 1.394c-.14.18-.333.35-.683.35l.245-3.47 6.3-5.693c.275-.248-.06-.372-.42-.145l-7.733 4.868-3.33-1.05c-.724-.225-.736-.725.15-.975l12.99-5.008c.608-.222 1.122.14.98.975z"/>
                        </svg>
                      </a>
                    )}
                    
                    {results.socialLinks.vk && (
                      <a 
                        href={results.socialLinks.vk} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={styles.socialLink}
                        title="ВКонтакте"
                      >
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="#4C75A3">
                          <path d="M21.547 7h-3.29a.743.743 0 0 0-.655.392s-1.312 2.416-1.734 3.23C14.734 12.813 14 12.126 14 11.11V7.603A1.104 1.104 0 0 0 12.896 6.5h-2.474a1.982 1.982 0 0 0-1.75.813s1.255-.204 1.255 1.49c0 .42.022 1.626.04 2.64a.73.73 0 0 1-1.272.503 21.54 21.54 0 0 1-2.498-4.543.693.693 0 0 0-.63-.403h-2.99a.508.508 0 0 0-.48.685C3.005 10.175 6.918 18 11.38 18h1.878a.742.742 0 0 0 .742-.742v-1.135a.73.73 0 0 1 1.23-.53l2.247 2.112a1.09 1.09 0 0 0 .746.295h2.953c1.424 0 1.424-.988.647-1.753-.546-.538-2.518-2.617-2.617-2.617a1.02 1.02 0 0 1-.078-1.323c.637-.84 1.68-2.212 2.122-2.8.603-.804 1.697-2.507.197-2.507z"/>
                        </svg>
                      </a>
                    )}
                  </div>
                )}
                
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
                
                <div className={styles.userActions}>
                  {/* Кнопка для перехода на профиль пользователя */}
                  <button 
                    className={styles.viewProfileButton}
                    onClick={() => router.push(`/user/${results.twitchData.login}`)}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                    </svg>
                    Просмотреть профиль
                  </button>
                  
                  {/* Кнопка для добавления отзывов/фильмов */}
                  {results.isRegisteredInSU && (
                    <button 
                      className={styles.addMediaButton}
                      onClick={() => router.push('/media/add')}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                      </svg>
                      Добавить отзыв/фильм
                    </button>
                  )}
                  
                  {/* Кнопка "Подписаться" в стиле синтвейв */}
                  {results.isRegisteredInSU && !results.isFollowed && (
                    <button className={styles["synthwave-btn"]} onClick={() => alert('Функция подписки будет доступна в следующей версии')}>
                      <div className={styles["synthwave-btn-glitch-mask"]}>
                        <span className={styles["synthwave-btn-text"]}>Подписаться</span>
                        <span className={styles["synthwave-btn-text-glitch"]}>Подписаться</span>
                      </div>
                      <div className={styles["synthwave-btn-scanlines"]}></div>
                      <div className={styles["synthwave-btn-glow"]}></div>
                      <div className={styles["synthwave-btn-grid"]}></div>
                      <div className={styles["synthwave-btn-borders"]}></div>
                      <div className={styles["synthwave-stars"]}>
                        <div className={styles.star}></div>
                        <div className={styles.star}></div>
                        <div className={styles.star}></div>
                        <div className={styles.star}></div>
                        <div className={styles.star}></div>
                      </div>
                      <div className={styles["synthwave-flare"]}></div>
                      <div className={styles["synthwave-noise"]}></div>
                      <div className={styles["synthwave-circles"]}></div>
                    </button>
                  )}
                  
                  {results.isRegisteredInSU && results.isFollowed && (
                    <div className={styles.followedMessage}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                      </svg>
                      Вы уже подписаны на этого пользователя
                    </div>
                  )}
                  
                  {!results.isRegisteredInSU && (
                    <div className={styles.notRegisteredMessage}>
                      Этот пользователь еще не зарегистрирован в Streamers Universe
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
