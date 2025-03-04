"use client";

import { useEffect, useState } from 'react';
import { cookies } from 'next/headers';
import styles from './profile.module.css';

export default function Profile() {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/twitch/profile', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch profile');
        const data = await response.json();
        setProfileData(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (!cookies().get('twitch_access_token')) {
    return <div>Пожалуйста, войдите через Twitch.</div>;
  }

  if (!profileData) {
    return <div>Ошибка загрузки данных профиля.</div>;
  }

  return (
    <div className={styles.container}>
      <h1>Профиль Twitch</h1>
      <p>Никнейм: {profileData.twitchName}</p>
      <h2>Фолловеры ({profileData.followersCount})</h2>
      <ul>
        {profileData.followers.map((follower, index) => (
          <li key={index}>{follower}</li>
        ))}
      </ul>
      <h2>Фолловинги ({profileData.followingsCount})</h2>
      <ul>
        {profileData.followings.map((following, index) => (
          <li key={index}>{following}</li>
        ))}
      </ul>
    </div>
  );
}
