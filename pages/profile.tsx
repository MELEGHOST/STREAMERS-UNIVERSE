"use client";

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie'; // Теперь с типами благодаря @types/js-cookie
import styles from './profile.module.css';

export default function Profile() {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const accessToken = Cookies.get('twitch_access_token');
    if (accessToken) {
      fetch('/api/twitch/profile', { credentials: 'include' })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch profile');
          return res.json();
        })
        .then(data => setProfileData(data))
        .catch(error => console.error('Error fetching profile:', error))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (!Cookies.get('twitch_access_token')) {
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
