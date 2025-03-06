"use client";

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import styles from './profile.module.css'; // Убедимся, что путь корректен (из pages/)
import { useRouter } from 'next/router';

interface TwitchProfile {
  twitchName: string;
  followersCount: number;
  followers: string[];
  followingsCount: number;
  followings: string[];
  profileImageUrl: string; // URL аватарки
  id: string; // Добавляем ID для аватарки
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
        const urlParams = new URLSearchParams(window.location.search);
        const userDataParam = urlParams.get('user');

        console.log('Проверка авторизации - accessToken:', accessToken ? 'присутствует' : 'отсутствует');
        console.log('Данные пользователя из URL:', userDataParam);

        if (!accessToken) {
          setError('Пожалуйста, войдите через Twitch.');
          setLoading(false);
          router.push('/auth');
          return;
        }

        let userData: any = null;
        if (userDataParam) {
          try {
            userData = JSON.parse(decodeURIComponent(userDataParam));
            console.log('Разобранные данные пользователя:', userData);
            localStorage.setItem('twitch_user', userDataParam);
            window.history.replaceState({}, document.title, '/profile'); // Удаляем параметры из URL
          } catch (e) {
            console.error('Ошибка парсинга данных пользователя:', e);
            setError('Ошибка парсинга данных профиля из URL');
            setLoading(false);
            return;
          }
        }

        try {
          // Fetch profile data with credentials to include cookies
          const response = await fetch('/api/twitch/profile', {
            method: 'GET',
            credentials: 'include', // Убедимся, что cookies передаются
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`, // Добавляем токен в заголовки для явной проверки
            },
          });

          console.log('Статус ответа API профиля:', response.status);
          console.log('Полный ответ API:', await response.clone().text());

          if (!response.ok) {
            throw new Error(`Не удалось загрузить профиль: ${response.status}`);
          }

          const data = await response.json();
          console.log('Полученные данные профиля:', data);
          // Добавляем URL аватарки из Twitch API
          const profileImageUrl = `https://static-cdn.jtvnw.net/jtv_user_pictures/${data.id}-profile_image-300x300.jpg`;
          setProfileData({
            ...data,
            profileImageUrl,
          });
        } catch (error: any) {
          console.error('Ошибка загрузки профиля:', error);
          setError(error.message || 'Не удалось загрузить профиль');
        } finally {
          setLoading(false);
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
      console.error('Ошибка выхода:', error);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (error) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.error}>
          {error}
          <button className={styles.button} onClick={() => router.push('/auth')}>
            Перейти к входу
          </button>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.error}>
          Ошибка загрузки данных профиля.
          <button className={styles.button} onClick={() => window.location.reload()}>
            Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.profileContainer}>
      <h1>Профиль Twitch</h1>
      {profileData.profileImageUrl && (
        <img src={profileData.profileImageUrl} alt={`${profileData.twitchName} аватарка`} className={styles.avatar} />
      )}
      <p>Никнейм: {profileData.twitchName}</p>

      <div className={styles.section}>
        <h2>Подписчики ({profileData.followersCount})</h2>
        <ul>
          {profileData.followers.length > 0 ? (
            profileData.followers.map((follower, index) => (
              <li key={index}>{follower}</li>
            ))
          ) : (
            <li>Нет подписчиков</li>
          )}
        </ul>
      </div>

      <div className={styles.section}>
        <h2>На кого подписан ({profileData.followingsCount})</h2>
        <ul>
          {profileData.followings.length > 0 ? (
            profileData.followings.map((following, index) => (
              <li key={index}>{following}</li>
            ))
          ) : (
            <li>Не подписан ни на кого</li>
          )}
        </ul>
      </div>

      {/* Добавляем возможность редактирования профиля */}
      <button className={styles.button} onClick={() => router.push('/edit-profile')}>
        Редактировать профиль
      </button>
      <button className={styles.button} onClick={handleLogout}>
        Выйти
      </button>
    </div>
  );
}
