'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import styles from './search.module.css';
import pageStyles from '../../styles/page.module.css';
import { useTranslation } from 'react-i18next';
import StyledSearchInput from '../components/StyledSearchInput/StyledSearchInput';
import Loader from '../components/Loader/Loader';

export default function SearchPage() {
  const router = useRouter();
  const { t } = useTranslation();
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
        throw new Error(errorData.error || t('search.searchError', { status: response.statusText }));
      }
      const data = await response.json();
      setResults(data);
      setIsDropdownVisible(data.length > 0);
    } catch (err) {
      console.error(t('search.searchErrorLog'), err);
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
    if (!result?.twitch_id) {
        console.error('[SearchPage] Cannot navigate, missing twitch_id in result:', result);
        setError(t('search.navigationError'));
        return;
    }
    setIsDropdownVisible(false);
    router.push(`/profile/${result.twitch_id}`);
  };

  if (authLoading) {
    return <div className={pageStyles.loadingContainer}><Loader /></div>;
  }

  if (!isAuthenticated) {
    router.replace('/');
    return <div className={pageStyles.loadingContainer}><Loader /></div>;
  }

  return (
    <div className={pageStyles.container}>
      <button 
        onClick={() => router.push('/menu')}
        className={pageStyles.backButton}
        style={{ position: 'absolute', top: '2rem', left: '2rem' }}
      >
        &larr; {t('search.backToMenu')}
      </button>
      <h1 className={pageStyles.title}>{t('search.title')}</h1>
      
      <div className={styles.searchContainer} ref={searchContainerRef}>
        <StyledSearchInput
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsDropdownVisible(results.length > 0)}
          placeholder={t('search.placeholder')}
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
                <span 
                    className={`${styles.statusIndicator} ${result.registered ? styles.registered : styles.notRegistered}`}
                    title={result.registered ? t('search.registered') : t('search.notRegistered')}
                ></span>
                {result.is_live && <span className={styles.liveBadge}>LIVE</span>}
              </div>
            ))}
          </div>
        )}
        {isDropdownVisible && !isLoading && results.length === 0 && query.length >= 2 && (
             <div className={`${styles.searchResultsDropdown} ${styles.noResults}`}>
                {t('search.noResults', { query })}
             </div>
        )}
      </div>

      {error && <p className={pageStyles.errorText}>{t('search.errorPrefix')}: {error}</p>}
    </div>
  );
}