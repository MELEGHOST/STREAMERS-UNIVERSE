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
  profileImageUrl: string;
  id: string;
  isStreamer?: boolean; // Добавлен новый параметр
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

        // Parse user data from URL if available
        let userData: any = null;
        if (userDataParam) {
          try {
            userData = JSON.parse(decodeURIComponent(userDataParam));
            console.log('Разобранные данные пользователя:', userData);
            
            // Убедимся, что статус стримера правильно сохранен
            // Проверяем, что если followersCount >= 150, то isStreamer должен быть true
            if (userData.followersCount >= 150 && userData.isStreamer === false) {
              userData.isStreamer = true;
              console.log('Корректировка статуса стримера: установлен в true, т.к. количество подписчиков >=150');
            }
            
            localStorage.setItem('twitch_user', JSON.stringify(userData));
            
            // Remove parameters from URL
            window.history.replaceState({}, document.title, '/profile');
            
            // If we have user data from URL but no auth token, the user might need to be redirected
            if (!accessToken) {
              console.log('No access token but we have user data - using fallback data');
              // Use userData as fallback
              const profileImageUrl = userData.profileImageUrl ||
                `https://static-cdn.jtvnw.net/jtv_user_pictures/${userData.id}-profile_image-300x300.jpg`;
              
              setProfileData({
                twitchName: userData.name || 'Unknown User',
                followersCount: userData.followersCount || 0,
                followers: [],
                followingsCount: 0,
                followings: [],
                profileImageUrl,
                id: userData.id,
                isStreamer: userData.isStreamer
              });
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error('Ошибка парсинга данных пользователя:', e);
          }
        }

        // If no auth token and no user data, redirect to auth
        if (!accessToken && !userData) {
          console.log('No auth token and no user data, redirecting to auth');
          setError('Пожалуйста, войдите через Twitch.');
          setLoading(false);
          router.push('/auth');
          return;
        }

        // Try to fetch profile data if we have an accessToken
        if (accessToken) {
          try {
            const response = await fetch('/api/twitch/profile', {
              method: 'GET',
              credentials: 'include',
            });

            if (response.ok) {
              const data = await response.json();
              console.log('Полученные данные профиля:', data);
              
              // Проверяем статус стримера на основе количества подписчиков
              const isStreamer = data.followersCount >= 150;
              
              // Update profile data
              const profileImageUrl = data.profileImageUrl || 
                `https://static-cdn.jtvnw.net/jtv_user_pictures/${data.id}-profile_image-300x300.jpg`;
              
              setProfileData({
                ...data,
                profileImageUrl,
                isStreamer, // Добавляем правильное значение статуса стримера
              });
              
              // Обновляем локальное хранилище с правильным статусом стримера
              if (userData) {
                userData.isStreamer = isStreamer;
                localStorage.setItem('twitch_user', JSON.stringify(userData));
              }
            } else {
              // API call failed, use userData as fallback if available
              if (userData) {
                console.log('API call failed, using fallback data');
                const profileImageUrl = userData.profileImageUrl ||
                  `https://static-cdn.jtvnw.net/jtv_user_pictures/${userData.id}-profile_image-300x300.jpg`;
                
                // Проверяем статус стримера на основе количества подписчиков
                const isStreamer = userData.followersCount >= 150;
                
                setProfileData({
                  twitchName: userData.name || 'Unknown User',
                  followersCount: userData.followersCount || 0,
                  followers: [],
                  followingsCount: 0,
                  followings: [],
                  profileImageUrl,
                  id: userData.id,
                  isStreamer, // Добавляем правильное значение статуса стримера
                });
                
                // Обновляем локальное хранилище с правильным статусом стримера
                userData.isStreamer = isStreamer;
                localStorage.setItem('twitch_user', JSON.stringify(userData));
              } else {
                throw new Error(`Не удалось загрузить профиль: ${response.status}`);
              }
            }
          } catch (error: any) {
            console.error('Ошибка загрузки профиля:', error);
            
            // If we have userData but the API call failed, use userData as fallback
            if (userData) {
              console.log('Using fallback user data after error');
              const profileImageUrl = userData.profileImageUrl ||
                `https://static-cdn.jtvnw.net/jtv_user_pictures/${userData.id}-profile_image-300x300.jpg`;
              
              // Проверяем статус стримера на основе количества подписчиков
              const isStreamer = userData.followersCount >= 150;
              
              setProfileData({
                twitchName: userData.name || 'Unknown User',
                followersCount: userData.followersCount || 0,
                followers: [],
                followingsCount: 0,
                followings: [],
                profileImageUrl,
                id: userData.id,
                isStreamer, // Добавляем правильное значение статуса стримера
              });
              
              // Обновляем локальное хранилище с правильным статусом стримера
              userData.isStreamer = isStreamer;
              localStorage.setItem('twitch_user', JSON.stringify(userData));
            } else {
              setError(error.message || 'Не удалось загрузить профиль');
            }
          }
        }
        
        setLoading(false);
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

      // Clear cookies and local storage
      Cookies.remove('twitch_access_token');
      Cookies.remove('twitch_refresh_token');
      Cookies.remove('twitch_expires_at');
      localStorage.removeItem('twitch_user');

      router.push('/auth');
    } catch (error) {
      console.error('Ошибка выхода:', error);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (error && !profileData) {
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
      <p>Статус: {profileData.isStreamer ? 'Стример' : 'Зритель'} (Подписчиков: {profileData.followersCount})</p>

      <div className={styles.section}>
        <h2>Подписчики ({profileData.followersCount})</h2>
        <ul>
          {profileData.followers && profileData.followers.length > 0 ? (
            profileData.followers.map((follower, index) => (
              <li key={index}>{follower}</li>
            ))
          ) : (
            <li>Нет данных о подписчиках</li>
          )}
        </ul>
      </div>

      <div className={styles.section}>
        <h2>На кого подписан ({profileData.followingsCount})</h2>
        <ul>
          {profileData.followings && profileData.followings.length > 0 ? (
            profileData.followings.map((following, index) => (
              <li key={index}>{following}</li>
            ))
          ) : (
            <li>Нет данных о подписках</li>
          )}
        </ul>
      </div>

      {profileData.isStreamer && (
        <button className={styles.button} onClick={() => router.push('/followers')}>
          Управление подписчиками
        </button>
      )}

      <button className={styles.button} onClick={() => router.push('/edit-profile')}>
        Редактировать профиль
      </button>
      <button className={styles.button} onClick={handleLogout}>
        Выйти
      </button>
    </div>
  );
}
