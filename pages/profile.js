'use client';

import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { getCookie, setCookie, setCookieWithLocalStorage, getCookieWithLocalStorage } from '../utils/cookies';
import styles from './profile.module.css';
import { useRouter } from 'next/router';
import CookieChecker from '../components/CookieChecker';
import SocialButton from '../components/SocialButton';

export default function Profile() {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const [socialLinks, setSocialLinks] = useState({
    description: '',
    twitch: '',
    youtube: '',
    discord: '',
    telegram: '',
    vk: '',
    yandexMusic: '',
    isMusician: false
  });

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
            
            // ВРЕМЕННОЕ РЕШЕНИЕ: Если у пользователя 150+ подписчиков, но статус не стример,
            // принудительно устанавливаем статус стримера
            if (localStorageUserData.followersCount >= 150 && !localStorageUserData.isStreamer) {
              console.log('ИСПРАВЛЕНИЕ: Обнаружено 150+ подписчиков, но статус не стример. Исправляем...');
              localStorageUserData.isStreamer = true;
              localStorage.setItem('twitch_user', JSON.stringify(localStorageUserData));
              console.log('Статус стримера принудительно установлен в localStorage');
            }
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
            
            let followers = [];
            let followersCount = 0;
            
            if (followersResponse.ok) {
              const followersData = await followersResponse.json();
              followersCount = followersData.total || 0;
              followers = followersData.data.map((f) => f.from_name);
              console.log(`Получено ${followersCount} подписчиков от Twitch API`);
              console.log('Данные о подписчиках:', followersData);
            } else {
              console.error('Ошибка при получении подписчиков:', followersResponse.status);
              console.error('Текст ошибки:', await followersResponse.text().catch(() => 'Не удалось получить текст ошибки'));
            }
            
            // Получаем подписки
            const followingsResponse = await fetch(`https://api.twitch.tv/helix/users/follows?from_id=${user.id}`, {
              method: 'GET',
              headers: {
                'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID || '',
                'Authorization': `Bearer ${finalAccessToken}`
              }
            });
            
            let followings = [];
            let followingsCount = 0;
            
            if (followingsResponse.ok) {
              const followingsData = await followingsResponse.json();
              followingsCount = followingsData.total || 0;
              followings = followingsData.data.map((f) => f.to_name);
            }
            
            // Принудительно устанавливаем статус стримера, если количество подписчиков >= 150
            const isStreamer = followersCount >= 150;
            console.log(`Проверка статуса стримера: ${followersCount} подписчиков, статус: ${isStreamer ? 'стример' : 'зритель'}`);
            console.log(`Условие followersCount >= 150: ${followersCount} >= 150 = ${followersCount >= 150}`);
            
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
            
          } catch (error) {
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
              console.log(`Проверка статуса стримера из localStorage: ${followersCount} подписчиков, статус: ${isStreamer ? 'стример' : 'зритель'}`);
              console.log(`Условие followersCount >= 150: ${followersCount} >= 150 = ${followersCount >= 150}`);
              
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

  // Функция для загрузки социальных ссылок
  const loadSocialLinks = async () => {
    try {
      // Сначала пробуем новый API-эндпоинт в директории app
      let response = await fetch('/api/user-socials', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Если новый API-эндпоинт недоступен, пробуем старый в директории pages
      if (!response.ok && response.status === 404) {
        console.log('Новый API-эндпоинт недоступен, пробуем старый');
        response = await fetch('/api/socials', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch social links: ${response.status}`);
      }

      const data = await response.json();
      setSocialLinks(data);
    } catch (error) {
      console.error('Error fetching social links:', error);
    }
  };

  useEffect(() => {
    loadUserData();
    
    // Проверяем данные в localStorage
    if (typeof window !== 'undefined') {
      try {
        const storedUserData = localStorage.getItem('twitch_user');
        if (storedUserData) {
          const userData = JSON.parse(storedUserData);
          console.log('Данные пользователя в localStorage при загрузке страницы:', userData);
          console.log('Статус стримера в localStorage:', userData.isStreamer);
          console.log('Количество подписчиков в localStorage:', userData.followersCount);
          console.log('Условие followersCount >= 150:', userData.followersCount >= 150);
        } else {
          console.log('Данные пользователя в localStorage отсутствуют');
        }
      } catch (e) {
        console.error('Ошибка при чтении данных из localStorage:', e);
      }
    }
  }, [router]);

  useEffect(() => {
    if (profileData) {
      loadSocialLinks();
    }
  }, [profileData]);

  const handleLogout = async () => {
    try {
      // Очищаем куки и localStorage
      Cookies.remove('twitch_access_token');
      Cookies.remove('twitch_refresh_token');
      Cookies.remove('twitch_user');
      localStorage.removeItem('twitch_user');
      localStorage.removeItem('cookie_twitch_access_token');
      localStorage.removeItem('cookie_twitch_refresh_token');
      localStorage.removeItem('cookie_twitch_user');
      
      // Перенаправляем на страницу авторизации
      router.push('/auth?clear_auth=true');
    } catch (error) {
      console.error('Ошибка при выходе:', error);
      setError('Произошла ошибка при выходе. Пожалуйста, попробуйте позже.');
    }
  };

  // Функция для отображения социальных ссылок
  const renderSocialLinks = () => {
    const links = [];
    
    if (socialLinks.twitch) {
      links.push(
        <SocialButton 
          key="twitch" 
          type="Twitch" 
          url={socialLinks.twitch} 
          username={profileData?.twitchName} 
          subscribers={profileData?.followersCount}
        />
      );
    }
    
    if (socialLinks.youtube) {
      links.push(
        <SocialButton 
          key="youtube" 
          type="YouTube" 
          url={socialLinks.youtube} 
          username={profileData?.twitchName}
        />
      );
    }
    
    if (socialLinks.discord) {
      links.push(
        <SocialButton 
          key="discord" 
          type="Discord" 
          url={socialLinks.discord} 
          username={profileData?.twitchName}
        />
      );
    }
    
    if (socialLinks.telegram) {
      links.push(
        <SocialButton 
          key="telegram" 
          type="Telegram" 
          url={socialLinks.telegram} 
          username={profileData?.twitchName}
        />
      );
    }
    
    if (socialLinks.vk) {
      links.push(
        <SocialButton 
          key="vk" 
          type="VK" 
          url={socialLinks.vk} 
          username={profileData?.twitchName}
        />
      );
    }
    
    if (socialLinks.isMusician && socialLinks.yandexMusic) {
      links.push(
        <SocialButton 
          key="yandexMusic" 
          type="YandexMusic" 
          url={socialLinks.yandexMusic} 
          username={profileData?.twitchName}
        />
      );
    }
    
    return links.length > 0 ? (
      <div className={styles.socialLinks}>
        {links}
      </div>
    ) : null;
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Загрузка профиля...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.error}>
          {error}
          <button className={styles.button} onClick={() => router.push('/auth')}>
            Вернуться на страницу авторизации
          </button>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.error}>
          Не удалось загрузить данные профиля
          <button className={styles.button} onClick={() => router.push('/auth')}>
            Вернуться на страницу авторизации
          </button>
        </div>
      </div>
    );
  }

  // ВРЕМЕННОЕ РЕШЕНИЕ: Проверяем и исправляем статус стримера перед отображением
  if (profileData.followersCount >= 150 && !profileData.isStreamer) {
    console.log('ИСПРАВЛЕНИЕ при отображении: Обнаружено 150+ подписчиков, но статус не стример. Исправляем...');
    profileData.isStreamer = true;
    // Также обновляем в localStorage
    localStorage.setItem('twitch_user', JSON.stringify(profileData));
    console.log('Статус стримера принудительно установлен перед отображением');
  }

  return (
    <div className={styles.profileContainer}>
      <CookieChecker />
      <div className={styles.profileHeader}>
        <img 
          src={profileData.profileImageUrl} 
          alt={`${profileData.twitchName} avatar`} 
          className={styles.avatar}
          onError={(e) => {
            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%237B41C9"%3E%3C/rect%3E%3Ctext x="100" y="100" font-family="Arial" font-size="24" text-anchor="middle" fill="white"%3ENo Image%3C/text%3E%3C/svg%3E';
          }}
        />
        <div className={styles.profileInfo}>
          <h1>{profileData.twitchName}</h1>
          {console.log('Отображение статуса стримера:', {
            isStreamer: profileData.isStreamer,
            followersCount: profileData.followersCount,
            condition: profileData.followersCount >= 150
          })}
          <p>Статус: {profileData.isStreamer ? 'Стример' : 'Зритель'} (Подписчиков: {profileData.followersCount})</p>
          {socialLinks.description && (
            <div className={styles.description}>
              <p>{socialLinks.description}</p>
            </div>
          )}
          {renderSocialLinks()}
        </div>
      </div>

      <div className={styles.section}>
        <h2>Подписчики ({profileData.followersCount})</h2>
        <ul>
          {profileData.followers && profileData.followers.length > 0 ? (
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
          {profileData.followings && profileData.followings.length > 0 ? (
            profileData.followings.map((following, index) => (
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