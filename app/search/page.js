'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import styles from './search.module.css';
import pageStyles from '../../styles/page.module.css';

export default function SearchPage() {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const searchTimeoutRef = useRef(null);
  const searchContainerRef = useRef(null);

  const performSearch = async (searchQuery) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setResults([]);
      setIsDropdownVisible(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch(`/api/search/combined?query=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Ошибка поиска: ${response.statusText}`);
      }
      const data = await response.json();
      setResults(data);
      setIsDropdownVisible(data.length > 0);
    } catch (err) {
      console.error("Ошибка поиска:", err);
      setError(err.message);
      setResults([]);
      setIsDropdownVisible(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (event) => {
    const newQuery = event.target.value;
    setQuery(newQuery);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(newQuery);
    }, 300);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsDropdownVisible(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchContainerRef]);

  const handleResultClick = (result) => {
    setIsDropdownVisible(false);
    router.push(`/profile/${result.twitch_id}`);
  };

  if (authLoading) {
    return <div className={pageStyles.loadingContainer}><div className="spinner"></div></div>;
  }

  if (!isAuthenticated) {
    router.replace('/');
    return <div className={pageStyles.loadingContainer}><p>Требуется авторизация...</p></div>;
  }

  return (
    <div className={pageStyles.container}>
      <h1 className={pageStyles.title}>Поиск пользователей</h1>
      
      <div className={styles.searchContainer} ref={searchContainerRef}>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsDropdownVisible(results.length > 0)}
          placeholder="Введите никнейм пользователя Twitch..."
          className={styles.searchInput}
          aria-label="Поиск пользователей"
        />
        {isLoading && <div className={`${styles.searchSpinner} spinner`}></div>}
        
        {isDropdownVisible && results.length > 0 && (
          <div className={styles.searchResultsDropdown}>
            {results.map((result) => (
              <div 
                key={result.twitch_id || result.login}
                className={styles.searchResultItem}
                onClick={() => handleResultClick(result)}
              >
                <Image 
                  src={result.avatar_url || '/default_avatar.png'} 
                  alt={result.display_name}
                  width={40}
                  height={40}
                  className={styles.searchResultAvatar}
                />
                <div className={styles.searchResultInfo}>
                  <span className={styles.searchResultName}>{result.display_name}</span>
                  <span className={styles.searchResultLogin}>@{result.login}</span>
                </div>
                {result.is_live && <span className={styles.liveBadge}>LIVE</span>}
                {result.registered && <span className={styles.registeredBadge} title="Зарегистрирован в Streamers Universe">✔️</span>}
              </div>
            ))}
          </div>
        )}
        {isDropdownVisible && !isLoading && results.length === 0 && query.length >= 2 && (
             <div className={`${styles.searchResultsDropdown} ${styles.noResults}`}>
                Ничего не найдено по запросу &quot;{query}&quot;.
             </div>
        )}
      </div>

      {error && <p className={pageStyles.errorText}>Ошибка: {error}</p>}
    </div>
  );
} 