"use client";

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import styles from './profile.module.css';
import { useRouter } from 'next/router';

interface TwitchProfile {
  twitchName: string;
  followersCount: number;
  followers: string[];
  followingsCount: number;
  followings: string[];
}

export default function Profile() {
  const [profileData, setProfileData] = useState<TwitchProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Parse URL parameters for user data
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const userData = urlParams.get('user');
      
      if (userData) {
        try {
          localStorage.setItem('twitch_user', userData);
          window.history.replaceState({}, document.title, '/profile'); // Remove parameters from URL
        } catch (e) {
          console.error('Failed to store user data:', e);
        }
      }

      const accessToken = Cookies.get('twitch_access_token');
      
      if (!accessToken) {
        setLoading(false);
        setError('Not authenticated');
        return;
      }

      // Fetch profile data
      fetch('/api/twitch/profile', { 
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
        .then(res => {
          if (!res.ok) {
            throw new Error(`Failed to fetch profile: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          setProfileData(data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error fetching profile:', error);
          setError(error.message || 'Failed to load profile');
          setLoading(false);
        });
    }
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/twitch/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      Cookies.remove('twitch_access_token');
      Cookies.remove('twitch_refresh_token');
      Cookies.remove('twitch_expires_at');
      
      router.push('/auth');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (error || !Cookies.get('twitch_access_token')) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.error}>
          Please log in through Twitch.
          <button className={styles.button} onClick={() => router.push('/auth')}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.error}>
          Error loading profile data.
          <button className={styles.button} onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.profileContainer}>
      <h1>Twitch Profile</h1>
      <p>Username: {profileData.twitchName}</p>
      
      <div className={styles.section}>
        <h2>Followers ({profileData.followersCount})</h2>
        <ul>
          {profileData.followers.length > 0 ? (
            profileData.followers.map((follower, index) => (
              <li key={index}>{follower}</li>
            ))
          ) : (
            <li>No followers</li>
          )}
        </ul>
      </div>
      
      <div className={styles.section}>
        <h2>Following ({profileData.followingsCount})</h2>
        <ul>
          {profileData.followings.length > 0 ? (
            profileData.followings.map((following, index) => (
              <li key={index}>{following}</li>
            ))
          ) : (
            <li>Not following anyone</li>
          )}
        </ul>
      </div>
      
      <button className={styles.button} onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}
