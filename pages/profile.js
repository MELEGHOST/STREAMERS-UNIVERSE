'use client';

import React, { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { getCookie, setCookie, setCookieWithLocalStorage, getCookieWithLocalStorage } from '../utils/cookies';
import styles from './profile.module.css';
import { useRouter } from 'next/router';
import CookieChecker from '../components/CookieChecker';
import SocialButton from '../components/SocialButton';
import AchievementsSystem from '../components/AchievementsSystem';

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
  const [showAchievements, setShowAchievements] = useState(false);
  const [streamsCompleted, setStreamsCompleted] = useState(0);
  const [hasCollaborations, setHasCollaborations] = useState(false);

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
            
            // ИСПРАВЛЕНИЕ: Если у пользователя 265+ подписчиков, но статус не стример,
            // принудительно устанавливаем статус стримера
            if (localStorageUserData.followersCount >= 265 && !localStorageUserData.isStreamer) {
              console.log('ИСПРАВЛЕНИЕ: Обнаружено 265+ подписчиков, но статус не стример. Исправляем...');
              localStorageUserData.isStreamer = true;
              localStorage.setItem('twitch_user', JSON.stringify(localStorageUserData));
              console.log('Статус стримера принудительно установлен в localStorage');
            }
            
            // Загружаем данные о стримах и коллаборациях из localStorage
            try {
              const streamsData = localStorage.getItem(`streams_${localStorageUserData.id}`);
              if (streamsData) {
                const parsedStreamsData = JSON.parse(streamsData);
                setStreamsCompleted(parsedStreamsData.completed || 0);
                setHasCollaborations(parsedStreamsData.hasCollaborations || false);
              } else {
                // Создаем начальные данные
                const initialStreamsData = {
                  completed: 0,
                  hasCollaborations: false,
                  lastStream: null
                };
                localStorage.setItem(`streams_${localStorageUserData.id}`, JSON.stringify(initialStreamsData));
              }
            } catch (e) {
              console.error('Ошибка при загрузке данных о стримах:', e);
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
            const followersResponse = await fetch(`https://api.twitch.tv/helix/users/follows?to_id=${user.id}&first=100`, {
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
              
              console.log(`Получено ${followersCount} подписчиков от Twitch API`);
              console.log('Данные о подписчиках:', JSON.stringify(followersData, null, 2));
              
              if (followersData.data && Array.isArray(followersData.data)) {
                followers = followersData.data.map((f) => f.from_name || f.from_login || 'Unknown');
                console.log('Обработанный список подписчиков:', followers);
              } else {
                console.error('Ошибка структуры данных подписчиков:', followersData);
              }
            } else {
              console.error('Ошибка при получении подписчиков:', followersResponse.status);
              console.error('Текст ошибки:', await followersResponse.text().catch(() => 'Не удалось получить текст ошибки'));
              
              // Пробуем получить данные из localStorage
              try {
                const storedUserData = localStorage.getItem('twitch_user');
                if (storedUserData) {
                  const userData = JSON.parse(storedUserData);
                  if (userData.followers && Array.isArray(userData.followers)) {
                    followers = userData.followers;
                    followersCount = userData.followersCount || followers.length;
                    console.log('Использованы данные о подписчиках из localStorage:', followers);
                  }
                }
              } catch (e) {
                console.error('Ошибка при получении данных о подписчиках из localStorage:', e);
              }
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
            
            // Принудительно устанавливаем статус стримера, если количество подписчиков >= 265
            const isStreamer = followersCount >= 265;
            console.log(`Проверка статуса стримера: ${followersCount} подписчиков, статус: ${isStreamer ? 'стример' : 'зритель'}`);
            console.log(`Условие followersCount >= 265: ${followersCount} >= 265 = ${followersCount >= 265}`);
            
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
              
              // Принудительно устанавливаем статус стримера, если количество подписчиков >= 265
              const followersCount = localStorageUserData.followersCount || 0;
              const isStreamer = followersCount >= 265;
              console.log(`Проверка статуса стримера из localStorage: ${followersCount} подписчиков, статус: ${isStreamer ? 'стример' : 'зритель'}`);
              console.log(`Условие followersCount >= 265: ${followersCount} >= 265 = ${followersCount >= 265}`);
              
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
          'Authorization': `Bearer ${getCookieWithLocalStorage('twitch_access_token')}`
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
            'Authorization': `Bearer ${getCookieWithLocalStorage('twitch_access_token')}`
          },
        });
      }

      if (!response.ok) {
        // Если оба API-эндпоинта недоступны, используем локальные данные
        console.log(`Не удалось получить социальные ссылки: ${response.status}`);
        
        // Пробуем получить данные из localStorage
        const userId = profileData?.id;
        if (userId) {
          const localSocialLinks = localStorage.getItem(`social_links_${userId}`);
          if (localSocialLinks) {
            setSocialLinks(JSON.parse(localSocialLinks));
            return;
          }
        }
        
        throw new Error(`Failed to fetch social links: ${response.status}`);
      }

      const data = await response.json();
      setSocialLinks(data);
      
      // Сохраняем данные в localStorage для резервного использования
      const userId = profileData?.id;
      if (userId) {
        localStorage.setItem(`social_links_${userId}`, JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error fetching social links:', error);
      
      // Пробуем получить данные из localStorage
      try {
        const userId = profileData?.id;
        if (userId) {
          const localSocialLinks = localStorage.getItem(`social_links_${userId}`);
          if (localSocialLinks) {
            setSocialLinks(JSON.parse(localSocialLinks));
            return;
          }
        }
      } catch (e) {
        console.error('Ошибка при получении данных из localStorage:', e);
      }
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
          console.log('Условие followersCount >= 265:', userData.followersCount >= 265);
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
    if (!socialLinks) return null;
    
    return (
      <div className={styles.socialLinks}>
        {socialLinks.twitch && (
          <SocialButton 
            type="twitch" 
            url={socialLinks.twitch} 
            username={socialLinks.twitch.split('/').pop()} 
          />
        )}
        
        {socialLinks.youtube && (
          <SocialButton 
            type="youtube" 
            url={socialLinks.youtube} 
            username={socialLinks.youtube.split('/').pop()} 
          />
        )}
        
        {socialLinks.discord && (
          <SocialButton 
            type="discord" 
            url={socialLinks.discord} 
            username={socialLinks.discord.split('/').pop()} 
          />
        )}
        
        {socialLinks.telegram && (
          <SocialButton 
            type="telegram" 
            url={socialLinks.telegram} 
            username={socialLinks.telegram.split('/').pop()} 
          />
        )}
        
        {socialLinks.vk && (
          <SocialButton 
            type="vk" 
            url={socialLinks.vk} 
            username={socialLinks.vk.split('/').pop()} 
          />
        )}
        
        {socialLinks.isMusician && socialLinks.yandexMusic && (
          <SocialButton 
            type="yandexMusic" 
            url={socialLinks.yandexMusic} 
            username={socialLinks.yandexMusic.split('/').pop()} 
          />
        )}
      </div>
    );
  };

  // Переключение отображения достижений
  const toggleAchievements = () => {
    setShowAchievements(!showAchievements);
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
  if (profileData.followersCount >= 265 && !profileData.isStreamer) {
    console.log('ИСПРАВЛЕНИЕ при отображении: Обнаружено 265+ подписчиков, но статус не стример. Исправляем...');
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
          <div className={styles.statusContainer}>
            <p className={styles.statusText}>
              Статус: <span className={styles.statusValue}>{profileData.isStreamer ? 'Стример' : 'Зритель'}</span>
              <span className={styles.followersCount}>(Фолловеров: {profileData.followersCount})</span>
            </p>
            <button 
              className={styles.achievementsButton} 
              onClick={toggleAchievements}
              title="Достижения"
            >
              🏆 Достижения
            </button>
          </div>
          {socialLinks.description && (
            <div className={styles.description}>
              <p>{socialLinks.description}</p>
            </div>
          )}
          {renderSocialLinks()}
        </div>
      </div>

      {showAchievements ? (
        <div className={styles.achievementsSection}>
          <div className={styles.achievementsHeader}>
            <h2>Достижения и прогресс</h2>
            <button 
              className={styles.backToProfileButton}
              onClick={toggleAchievements}
            >
              Вернуться в профиль
            </button>
          </div>
          <AchievementsSystem 
            user={profileData}
            followerCount={profileData.followersCount || 0}
            isStreamer={profileData.isStreamer || false}
            streamsCompleted={streamsCompleted}
            hasCollaborations={hasCollaborations}
          />
        </div>
      ) : (
        <>
          <div className={styles.section}>
            <h2>Фолловеры ({profileData.followersCount})</h2>
            <ul>
              {profileData.followers && profileData.followers.length > 0 ? (
                profileData.followers.map((follower, index) => (
                  <li key={index}>{follower}</li>
                ))
              ) : (
                <li>Нет фолловеров</li>
              )}
            </ul>
          </div>

          <div className={styles.section}>
            <h2>Фолловинги ({profileData.followingsCount})</h2>
            <ul>
              {profileData.followings && profileData.followings.length > 0 ? (
                profileData.followings.map((following, index) => (
                  <li key={index}>{following}</li>
                ))
              ) : (
                <li>Нет фолловингов</li>
              )}
            </ul>
          </div>
          
          {/* Секция для медиа и тирлистов */}
          {profileData.isStreamer && (
            <div className={styles.mediaSection}>
              <div className={styles.mediaSectionHeader}>
                <h2>Медиа и тирлисты</h2>
                <div className={styles.mediaSectionActions}>
                  <button 
                    className={styles.button}
                    onClick={() => router.push('/media/add')}
                  >
                    Добавить медиа
                  </button>
                  <button 
                    className={styles.button}
                    onClick={() => router.push('/tierlists/create')}
                  >
                    Создать тирлист
                  </button>
                </div>
              </div>
              
              <div className={styles.mediaCategories}>
                <button 
                  className={`${styles.categoryButton} ${styles.active}`}
                  onClick={() => {/* Фильтрация по категории */}}
                >
                  Все
                </button>
                <button 
                  className={styles.categoryButton}
                  onClick={() => {/* Фильтрация по категории */}}
                >
                  Фильмы
                </button>
                <button 
                  className={styles.categoryButton}
                  onClick={() => {/* Фильтрация по категории */}}
                >
                  Сериалы
                </button>
                <button 
                  className={styles.categoryButton}
                  onClick={() => {/* Фильтрация по категории */}}
                >
                  Игры
                </button>
                <button 
                  className={styles.categoryButton}
                  onClick={() => {/* Фильтрация по категории */}}
                >
                  Книги
                </button>
              </div>
              
              <div className={styles.mediaContent}>
                <div className={styles.mediaEmptyState}>
                  <div className={styles.mediaEmptyIcon}>🎬</div>
                  <h3>Нет добавленных медиа</h3>
                  <p>Добавьте фильмы, сериалы, игры и другие медиа, чтобы делиться своими оценками и создавать тирлисты</p>
                  <button 
                    className={styles.button}
                    onClick={() => router.push('/media/add')}
                  >
                    Добавить медиа
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className={styles.profileActions}>
            <button className={styles.button} onClick={() => router.push('/edit-profile')}>
              Редактировать профиль
            </button>
            <button className={styles.button} onClick={() => router.push('/menu')}>
              Вернуться в меню
            </button>
            <button className={styles.logoutButton} onClick={handleLogout}>
              Выйти
            </button>
          </div>
        </>
      )}
    </div>
  );
} 