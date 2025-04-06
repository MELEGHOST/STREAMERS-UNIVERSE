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
    console.log('[SearchPage] Clicking result, attempting to navigate to profile:', result?.twitch_id, result);
    if (!result?.twitch_id) {
        console.error('[SearchPage] Cannot navigate, missing twitch_id in result:', result);
        setError('Не удалось перейти в профиль: отсутствует ID пользователя.');
        return;
    }
    setIsDropdownVisible(false);
    router.push(`/profile/${result.twitch_id}`);
  };
}