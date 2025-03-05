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
    const checkAuthAndLoadProfile = async () => {
      if (typeof window !== 'undefined') {
        const accessToken = Cookies.get('twitch_access_token');

        console.log('Checking authentication - accessToken:', accessToken ? 'present' : 'missing');

        if (!accessToken) {
          setError('Not authenticated');
          setLoading(false);
          router.push('/auth');
          return;
        }

        try {
          // Fetch profile data with credentials to include cookies
          const response = await fetch('/api/twitch/profile', {
            method: 'GET',
            credentials: 'include', // Убедимся, что cookies передаются
            headers: {
              'Content-Type': 'application/json',
            },
          });

          console.log('Profile API response status:', response.status);

          if (!response.ok) {
            throw new Error(`Failed to fetch profile: ${response.status}`);
          }

          const data = await response.json();
          setProfileData(data);
        } catch (error: any) {
          console.error('Error fetching profile:', error);
          setError(error.message || 'Failed to load profile');
        } finally {
          setLoading(false);
        }

        // Очистка URL-параметров, если они есть
        const urlParams = new URLSearchParams(window.location.search);
        const userData = urlParams.get('user');
        if (userData) {
          try {
            localStorage.setItem('twitch_user', userData);
            window.history.replaceState({}, document.title, '/profile'); // Удаляем параметры из URL
          } catch (e) {
            console.error('Failed to store user data:', e);
          }
        }
      }
    };

    checkAuthAndLoadProfile();
  }, [router]);

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

  if (error) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.error}>
          {error}
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

      {/* Добавляем возможность редактирования профиля */}
      <button className={styles.button} onClick={() => router.push('/edit-profile')}>
        Edit Profile
      </button>
      <button className={styles.button} onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}
