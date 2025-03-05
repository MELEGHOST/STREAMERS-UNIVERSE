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
      <h1>Search User</h1>
      <div className={styles.searchBox}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Enter Twitch username"
          className={styles.input}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button 
          className={styles.button} 
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
      
      {results && (
        <div className={styles.result}>
          {results.error && <p className={styles.error}>{results.error}</p>}
          {results.twitchData && (
            <>
              <p>Username: {results.twitchData.display_name}</p>
              <p>Registered in app: {results.isRegistered ? 'Yes' : 'No'}</p>
              <p>Followers: {results.followers}</p>
              <p>Common streamers: {results.commonStreamers?.length > 0 ? 
                results.commonStreamers.join(', ') : 'None'}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
