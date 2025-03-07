"use client";

import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { getCookie, setCookie, setCookieWithLocalStorage } from '../utils/cookies';
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

  // Функция для загрузки данных пользователя
  const loadUserData = async () => {
    if (typeof window !== 'undefined') {
      // Проверяем наличие токена доступа в куках или localStorage
      const accessToken = getCookie('twitch_access_token') || localStorage.getItem('cookie_twitch_access_token');
      
      console.log('Проверка авторизации - accessToken:', accessToken ? 'присутствует' : 'отсутствует');
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
      
      // If no auth token and no user data, redirect to auth
      if (!accessToken && !localStorageUserData) {
        console.log('No auth token and no user data, redirecting to auth');
        setError('Пожалуйста, войдите через Twitch.');
        setLoading(false);
        router.push('/auth');
        return;
      }
      
      // If we have user data but no auth token, the user might need to be redirected
      if (localStorageUserData && !accessToken) {
        console.log('No access token but we have user data - using fallback data');
        // Use userData as fallback
        const profileImageUrl = localStorageUserData.profileImageUrl ||
          localStorageUserData.profile_image_url ||
          `https://static-cdn.jtvnw.net/jtv_user_pictures/${localStorageUserData.id}-profile_image-300x300.jpg`;
        
        setProfileData({
          twitchName: localStorageUserData.twitchName || localStorageUserData.display_name || 'Unknown User',
          followersCount: localStorageUserData.followersCount || 0,
          followers: localStorageUserData.followers || [],
          followingsCount: localStorageUserData.followingsCount || 0,
          followings: localStorageUserData.followings || [],
          profileImageUrl,
          id: localStorageUserData.id,
          isStreamer: localStorageUserData.isStreamer || false
        });
        setLoading(false);
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
            if (localStorageUserData) {
              localStorageUserData.isStreamer = isStreamer;
              localStorage.setItem('twitch_user', JSON.stringify(localStorageUserData));
            }
          } else {
            // API call failed, use userData as fallback if available
            if (localStorageUserData) {
              console.log('API call failed, using fallback data');
              const profileImageUrl = localStorageUserData.profileImageUrl ||
                localStorageUserData.profile_image_url ||
                `https://static-cdn.jtvnw.net/jtv_user_pictures/${localStorageUserData.id}-profile_image-300x300.jpg`;
              
              // Проверяем статус стримера на основе количества подписчиков
              const isStreamer = localStorageUserData.followersCount >= 150;
              
              setProfileData({
                twitchName: localStorageUserData.display_name || 'Unknown User',
                followersCount: localStorageUserData.followersCount || 0,
                followers: [],
                followingsCount: 0,
                followings: [],
                profileImageUrl,
                id: localStorageUserData.id,
                isStreamer, // Всегда устанавливаем на основе количества подписчиков
              });
              
              // Обновляем локальное хранилище с правильным статусом стримера
              localStorageUserData.isStreamer = isStreamer;
              localStorage.setItem('twitch_user', JSON.stringify(localStorageUserData));
            } else {
              throw new Error(`Не удалось загрузить профиль: ${response.status}`);
            }
          }
        } catch (error: any) {
          console.error('Ошибка загрузки профиля:', error);
          
          // If we have userData but the API call failed, use userData as fallback
          if (localStorageUserData) {
            console.log('Using fallback user data after error');
            const profileImageUrl = localStorageUserData.profileImageUrl ||
              localStorageUserData.profile_image_url ||
              `https://static-cdn.jtvnw.net/jtv_user_pictures/${localStorageUserData.id}-profile_image-300x300.jpg`;
            
            // Проверяем статус стримера на основе количества подписчиков
            const isStreamer = localStorageUserData.followersCount >= 150;
            
            setProfileData({
              twitchName: localStorageUserData.display_name || 'Unknown User',
              followersCount: localStorageUserData.followersCount || 0,
              followers: [],
              followingsCount: 0,
              followings: [],
              profileImageUrl,
              id: localStorageUserData.id,
              isStreamer, // Всегда устанавливаем на основе количества подписчиков
            });
            
            // Обновляем локальное хранилище с правильным статусом стримера
            localStorageUserData.isStreamer = isStreamer;
            localStorage.setItem('twitch_user', JSON.stringify(localStorageUserData));
          } else {
            setError(error.message || 'Не удалось загрузить профиль');
          }
        }
      }
      
      setLoading(false);
    }
  };

  useEffect(() => {
    // Проверяем наличие параметра smooth в URL
    const urlParams = new URLSearchParams(window.location.search);
    const isSmooth = urlParams.get('smooth') === 'true';
    
    // Если есть параметр smooth, добавляем плавный переход
    if (isSmooth) {
      document.body.style.opacity = '0';
      document.body.style.transition = 'opacity 0.5s ease';
      
      // Плавно показываем страницу после загрузки
      setTimeout(() => {
        document.body.style.opacity = '1';
      }, 100);
    }
    
    // Проверяем наличие данных пользователя в URL
    const userParam = urlParams.get('user');
    if (userParam) {
      try {
        const userData = JSON.parse(userParam);
        console.log('Получены данные пользователя из URL:', userData);
        
        // Сохраняем данные пользователя в localStorage и куки
        localStorage.setItem('twitch_user', JSON.stringify(userData));
        setCookieWithLocalStorage('twitch_user', JSON.stringify(userData));
        
        // Устанавливаем данные пользователя в состояние
        setProfileData(userData);
      } catch (e) {
        console.error('Ошибка при обработке данных пользователя из URL:', e);
      }
    }
    
    // Продолжаем обычную загрузку данных пользователя
    loadUserData();
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
