"use client";

import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { getCookie, setCookie, setCookieWithLocalStorage, getCookieWithLocalStorage } from '../utils/cookies';
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
      try {
        // Проверяем наличие токена доступа в куках или localStorage
        const accessToken = getCookieWithLocalStorage('twitch_access_token');
        
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
        
        // Если нет токена доступа, пробуем получить его из localStorage
        if (!accessToken) {
          const localStorageToken = localStorage.getItem('cookie_twitch_access_token');
          if (localStorageToken) {
            console.log('Найден токен в localStorage, используем его');
            // Устанавливаем токен в куки
            setCookieWithLocalStorage('twitch_access_token', localStorageToken);
          }
        }
        
        // Повторно проверяем наличие токена доступа
        const finalAccessToken = accessToken || localStorage.getItem('cookie_twitch_access_token');
        
        // If no auth token and no user data, redirect to auth
        if (!finalAccessToken && !localStorageUserData) {
          console.log('No auth token and no user data, redirecting to auth');
          setError('Пожалуйста, войдите через Twitch.');
          setLoading(false);
          router.push('/auth?clear_auth=true');
          return;
        }
        
        // If we have user data but no auth token, the user might need to be redirected
        if (localStorageUserData && !finalAccessToken) {
          console.log('No access token but we have user data - redirecting to auth for re-login');
          setError('Срок действия авторизации истек. Пожалуйста, войдите снова.');
          setLoading(false);
          
          // Задержка перед редиректом, чтобы пользователь увидел сообщение
          setTimeout(() => {
            router.push('/auth?clear_auth=true');
          }, 2000);
          return;
        }
        
        // Try to fetch profile data if we have an accessToken
        if (finalAccessToken) {
          try {
            console.log('Отправка запроса к API с токеном:', finalAccessToken.substring(0, 10) + '...');
            
            // Добавляем токен доступа в куки перед запросом
            Cookies.set('twitch_access_token', finalAccessToken, { path: '/' });
            
            // Используем прямой запрос к Twitch API вместо нашего API
            const userResponse = await fetch('https://api.twitch.tv/helix/users', {
              method: 'GET',
              headers: {
                'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID || '',
                'Authorization': `Bearer ${finalAccessToken}`
              }
            });
            
            if (!userResponse.ok) {
              throw new Error(`Ошибка получения данных пользователя: ${userResponse.status}`);
            }
            
            const userData = await userResponse.json();
            
            if (!userData.data || userData.data.length === 0) {
              throw new Error('Пользователь не найден в ответе Twitch API');
            }
            
            const user = userData.data[0];
            
            // Получаем подписчиков
            const followersResponse = await fetch(`https://api.twitch.tv/helix/users/follows?to_id=${user.id}`, {
              method: 'GET',
              headers: {
                'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID || '',
                'Authorization': `Bearer ${finalAccessToken}`
              }
            });
            
            let followers: string[] = [];
            let followersCount = 0;
            
            if (followersResponse.ok) {
              const followersData = await followersResponse.json();
              followersCount = followersData.total || 0;
              followers = followersData.data.map((f: any) => f.from_name);
            }
            
            // Получаем подписки
            const followingsResponse = await fetch(`https://api.twitch.tv/helix/users/follows?from_id=${user.id}`, {
              method: 'GET',
              headers: {
                'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID || '',
                'Authorization': `Bearer ${finalAccessToken}`
              }
            });
            
            let followings: string[] = [];
            let followingsCount = 0;
            
            if (followingsResponse.ok) {
              const followingsData = await followingsResponse.json();
              followingsCount = followingsData.total || 0;
              followings = followingsData.data.map((f: any) => f.to_name);
            }
            
            // Принудительно устанавливаем статус стримера, если количество подписчиков >= 150
            const isStreamer = followersCount >= 150;
            console.log(`Проверка статуса стримера: ${followersCount} подписчиков, статус: ${isStreamer ? 'стример' : 'зритель'}`);
            
            // Формируем данные профиля
            const profileData = {
              twitchName: user.display_name,
              followersCount,
              followers,
              followingsCount,
              followings,
              id: user.id,
              profileImageUrl: user.profile_image_url,
              isStreamer
            };
            
            console.log('Полученные данные профиля:', profileData);
            
            // Устанавливаем данные профиля
            setProfileData(profileData);
            
            // Обновляем локальное хранилище с правильным статусом стримера
            localStorage.setItem('twitch_user', JSON.stringify(profileData));
            
          } catch (error: any) {
            console.error('Ошибка загрузки профиля:', error);
            
            // If we have userData but the API call failed, use userData as fallback
            if (localStorageUserData) {
              console.log('Using fallback user data after error');
              const profileImageUrl = localStorageUserData.profileImageUrl ||
                localStorageUserData.profile_image_url ||
                `https://static-cdn.jtvnw.net/jtv_user_pictures/${localStorageUserData.id}-profile_image-300x300.jpg`;
              
              // Принудительно устанавливаем статус стримера, если количество подписчиков >= 150
              const followersCount = localStorageUserData.followersCount || 0;
              const isStreamer = followersCount >= 150;
              console.log(`Проверка статуса стримера: ${followersCount} подписчиков, статус: ${isStreamer ? 'стример' : 'зритель'}`);
              
              setProfileData({
                twitchName: localStorageUserData.display_name || 'Unknown User',
                followersCount: followersCount,
                followers: localStorageUserData.followers || [],
                followingsCount: localStorageUserData.followingsCount || 0,
                followings: localStorageUserData.followings || [],
                profileImageUrl,
                id: localStorageUserData.id,
                isStreamer: isStreamer, // Принудительно устанавливаем на основе количества подписчиков
              });
              
              // Обновляем локальное хранилище с правильным статусом стримера
              localStorageUserData.isStreamer = isStreamer;
              localStorage.setItem('twitch_user', JSON.stringify(localStorageUserData));
            } else {
              setError(error.message || 'Не удалось загрузить профиль');
              
              // Если ошибка связана с авторизацией, перенаправляем на страницу авторизации
              if (error.message && (error.message.includes('401') || error.message.includes('авторизац'))) {
                console.log('Ошибка авторизации, перенаправление на страницу авторизации');
                
                // Очищаем куки и localStorage
                Cookies.remove('twitch_access_token');
                Cookies.remove('twitch_refresh_token');
                localStorage.removeItem('cookie_twitch_access_token');
                localStorage.removeItem('cookie_twitch_refresh_token');
                
                // Задержка перед редиректом, чтобы пользователь увидел сообщение
                setTimeout(() => {
                  router.push('/auth?clear_auth=true');
                }, 2000);
              }
            }
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Глобальная ошибка загрузки профиля:', error);
        setError('Произошла ошибка при загрузке профиля. Пожалуйста, попробуйте позже.');
        setLoading(false);
      }
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
    
    // Проверяем наличие токена доступа
    const accessToken = getCookieWithLocalStorage('twitch_access_token');
    
    // Проверяем, что токен не пустой и не undefined
    if (!accessToken || accessToken === 'undefined' || accessToken === 'null') {
      console.log('Токен доступа не найден или недействителен, перенаправление на страницу авторизации');
      setError('Необходима авторизация. Пожалуйста, войдите через Twitch.');
      
      // Очищаем куки и localStorage
      Cookies.remove('twitch_access_token');
      Cookies.remove('twitch_refresh_token');
      localStorage.removeItem('cookie_twitch_access_token');
      localStorage.removeItem('cookie_twitch_refresh_token');
      
      // Задержка перед редиректом, чтобы пользователь увидел сообщение
      setTimeout(() => {
        router.push('/auth?clear_auth=true');
      }, 2000);
      return;
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
      <div className={styles.profileContainer}>
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
      <div className={styles.profileContainer}>
        <CookieChecker />
        <div className={styles.error}>
          <p>{error}</p>
          <div className={styles.buttonContainer}>
            <button onClick={() => router.push('/auth?clear_auth=true')} className={styles.button}>
              Войти через Twitch
            </button>
            <button onClick={() => window.location.reload()} className={styles.button}>
              Повторить загрузку
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className={styles.profileContainer}>
        <CookieChecker />
        <div className={styles.error}>
          Ошибка загрузки данных профиля.
          <div className={styles.buttonContainer}>
            <button className={styles.button} onClick={() => window.location.reload()}>
              Повторить
            </button>
            <button className={styles.button} onClick={() => router.push('/auth?clear_auth=true')}>
              Войти заново
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.profileContainer}>
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
            profileData.followers.map((follower: string, index: number) => (
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
          {profileData.followings && profileData.followings.length > 0 ? (
            profileData.followings.map((following: string, index: number) => (
              <li key={index}>{following}</li>
            ))
          ) : (
            <li>Нет подписок</li>
          )}
        </ul>
      </div>

      <div className={styles.profileActions}>
        <button className={styles.button} onClick={() => router.push('/edit-profile')}>
          Редактировать профиль
        </button>
        <button className={styles.button} onClick={() => router.push('/followers')}>
          Подписчики
        </button>
        <button className={styles.button} onClick={() => router.push('/subscriptions')}>
          Подписки
        </button>
        <button className={styles.button} onClick={() => router.push('/menu')}>
          Вернуться в меню
        </button>
        <button className={styles.logoutButton} onClick={handleLogout}>
          Выйти
        </button>
      </div>
    </div>
  );
}
