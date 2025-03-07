"use client";

import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { getCookie, setCookie } from '../utils/cookies';
import styles from './profile.module.css';
import { useRouter } from 'next/router';
import CookieChecker from '../components/CookieChecker';

interface TwitchProfile {
  twitchName: string;
  followersCount: number;
  followers: string[];
  followingsCount: number;
  followings: string[];
  profileImageUrl: string;
  id: string;
  isStreamer?: boolean;
}

export default function Profile() {
  const [profileData, setProfileData] = useState<TwitchProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndLoadProfile = async () => {
      if (typeof window !== 'undefined') {
        // Проверяем наличие токена доступа в куках или localStorage
        const accessToken = getCookie('twitch_access_token') || localStorage.getItem('cookie_twitch_access_token');
        const urlParams = new URLSearchParams(window.location.search);
        const userDataParam = urlParams.get('user');

        console.log('Проверка авторизации - accessToken:', accessToken ? 'присутствует' : 'отсутствует');
        console.log('Данные пользователя из URL:', userDataParam);
        console.log('Текущий домен:', window.location.origin);
        console.log('Сохраненный домен:', localStorage.getItem('current_domain'));

        // Проверяем наличие данных пользователя в localStorage
        let localStorageUserData = null;
        try {
          const storedUserData = localStorage.getItem('twitch_user');
          if (storedUserData) {
            localStorageUserData = JSON.parse(storedUserData);
            console.log('Данные пользователя из localStorage:', localStorageUserData);
          }
        } catch (e) {
          console.error('Ошибка при получении данных пользователя из localStorage:', e);
        }

        // Parse user data from URL if available
        let userData: any = null;
        if (userDataParam) {
          try {
            userData = JSON.parse(decodeURIComponent(userDataParam));
            console.log('Разобранные данные пользователя из URL:', userData);
            
            // Всегда проверяем статус стримера на основе количества подписчиков
            // и устанавливаем правильное значение
            const isStreamer = userData.followersCount >= 150;
            userData.isStreamer = isStreamer;
            console.log(`Проверка статуса стримера: ${userData.followersCount} подписчиков, статус: ${isStreamer}`);
            
            // Сохраняем данные в localStorage и куки
            localStorage.setItem('twitch_user', JSON.stringify(userData));
            setCookie('twitch_user', JSON.stringify(userData));
            
            // Remove parameters from URL
            window.history.replaceState({}, document.title, '/profile');
          } catch (e) {
            console.error('Ошибка парсинга данных пользователя из URL:', e);
          }
        }

        // Используем данные в порядке приоритета: URL > localStorage > куки
        const finalUserData = userData || localStorageUserData;

        // If we have user data but no auth token, the user might need to be redirected
        if (finalUserData && !accessToken) {
          console.log('No access token but we have user data - using fallback data');
          // Use userData as fallback
          const profileImageUrl = finalUserData.profileImageUrl ||
            `https://static-cdn.jtvnw.net/jtv_user_pictures/${finalUserData.id}-profile_image-300x300.jpg`;
          
          setProfileData({
            twitchName: finalUserData.twitchName || finalUserData.display_name || 'Unknown User',
            followersCount: finalUserData.followersCount || 0,
            followers: finalUserData.followers || [],
            followingsCount: finalUserData.followingsCount || 0,
            followings: finalUserData.followings || [],
            profileImageUrl,
            id: finalUserData.id,
            isStreamer: finalUserData.isStreamer || false
          });
          setLoading(false);
          return;
        }

        // If no auth token and no user data, redirect to auth
        if (!accessToken && !finalUserData) {
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
                isStreamer, // Всегда устанавливаем на основе количества подписчиков
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
                  isStreamer, // Всегда устанавливаем на основе количества подписчиков
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
                isStreamer, // Всегда устанавливаем на основе количества подписчиков
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
    return (
      <div className={styles.container}>
        <CookieChecker />
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  if (error && !profileData) {
    return (
      <div className={styles.container}>
        <CookieChecker />
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={() => router.push('/auth')} className={styles.authButton}>
            Войти через Twitch
          </button>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className={styles.container}>
        <CookieChecker />
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
    <div className={styles.container}>
      <CookieChecker />
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
