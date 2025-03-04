"use client";

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import styles from './profile.module.css';

export default function Profile() {
  const { data: session, status } = useSession();
  const [profileData, setProfileData] = useState(null);

  useEffect(() => {
    if (status === 'authenticated' && session?.accessToken) {
      fetch('/api/twitch/profile')
        .then(res => res.json())
        .then(data => setProfileData(data))
        .catch(error => console.error('Error fetching profile:', error));
    }
  }, [status, session]);

  if (status === 'loading') {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (status === 'unauthenticated') {
    return <div>Пожалуйста, войдите через Twitch.</div>;
  }

  if (!profileData) {
    return <div>Загрузка данных профиля...</div>;
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
