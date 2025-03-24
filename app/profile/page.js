'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './profile.module.css';
import SocialButton from '../components/SocialButton';
import AchievementsSystem from '../components/AchievementsSystem';
import ReviewSection from '../components/ReviewSection';
import { checkBirthday, getDaysToBirthday } from '../utils/birthdayCheck';
import { getUserData, getUserFollowers, getUserStats, fetchWithTokenRefresh, getUserFollowings } from '../utils/twitchAPI';
import { DataStorage } from '../utils/dataStorage';
import { useAuth } from '../../contexts/AuthContext';
import Cookies from 'js-cookie';
import CyberAvatar from '../components/CyberAvatar';

export default function Profile() {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { isAuthenticated, userId, userLogin, userAvatar, isInitialized } = useAuth();
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
  const [showReviews, setShowReviews] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowings, setShowFollowings] = useState(false);
  const [showStreams, setShowStreams] = useState(false);
  const [streamsCompleted, setStreamsCompleted] = useState(0);
  const [hasCollaborations, setHasCollaborations] = useState(false);
  const [isBirthday, setIsBirthday] = useState(false);
  const [daysToBirthday, setDaysToBirthday] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [followings, setFollowings] = useState([]);
  const [tierlists, setTierlists] = useState([]);
  const [showTierlists, setShowTierlists] = useState(false);
  const [statsVisibility, setStatsVisibility] = useState({
    followers: true,
    followings: true,
    streams: true,
    channel: true,
    accountInfo: true
  });
  const [loadAttempts, setLoadAttempts] = useState(0);
  const [totalFollowers, setTotalFollowers] = useState(0);
  const [totalFollowings, setTotalFollowings] = useState(0);

  // Функция для получения данных пользователя с сервера с обработкой CORS ошибок
  const getUserData = async () => {
    try {
      // Добавляем несколько стратегий получения данных
      let userData = null;
      let fetchError = null;
      
      // Стратегия 1: Запрос к нашему API
      try {
        console.log('Попытка получить данные через API (/api/twitch/user)...');
        // Добавляем параметр для предотвращения кэширования
        const response = await fetch(`/api/twitch/user?_=${Date.now()}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          },
          credentials: 'include',
          mode: 'cors', // Добавляем режим CORS
          next: { revalidate: 0 } // Отключаем кэширование Next.js
        });
        
        if (response.ok) {
          userData = await response.json();
          console.log('Данные пользователя успешно получены с сервера:', userData);
          // Обновляем localStorage для будущих запросов
          if (userData && userData.id) {
            localStorage.setItem('twitch_user', JSON.stringify(userData));
            localStorage.setItem('is_authenticated', 'true');
          }
          return userData;
        } else {
          fetchError = `Ошибка API: ${response.status}`;
          console.error('Ошибка при получении данных пользователя с сервера:', response.status);
        }
      } catch (apiError) {
        console.error('Сетевая ошибка при запросе к API:', apiError);
        fetchError = apiError.message || 'Сетевая ошибка';
      }
      
      // Стратегия 2: Использовать данные из localStorage
      try {
        console.log('Попытка получить данные из localStorage...');
        const storedUserData = localStorage.getItem('twitch_user');
        if (storedUserData) {
          userData = JSON.parse(storedUserData);
          if (userData && userData.id) {
            console.log('Данные пользователя успешно получены из localStorage:', userData.id);
            return userData;
          }
        }
      } catch (localError) {
        console.error('Ошибка при получении данных из localStorage:', localError);
      }
      
      // Стратегия 3: Проверить cookie_twitch_user
      try {
        console.log('Попытка получить данные из cookie_twitch_user...');
        const altUserData = localStorage.getItem('cookie_twitch_user');
        if (altUserData) {
          userData = JSON.parse(altUserData);
          if (userData && userData.id) {
            console.log('Данные пользователя успешно получены из cookie_twitch_user:', userData.id);
            // Обновляем основное хранилище
            localStorage.setItem('twitch_user', JSON.stringify(userData));
            return userData;
          }
        }
      } catch (cookieError) {
        console.error('Ошибка при получении данных из cookie_twitch_user:', cookieError);
      }
      
      // Если все стратегии не сработали, возвращаем ошибку
      console.error('Не удалось получить данные пользователя ни одним из способов');
      return null;
    } catch (error) {
      console.error('Критическая ошибка при запросе данных пользователя:', error);
      return null;
    }
  };

  // Функции загрузки данных с обработкой сетевых ошибок
  const loadFollowers = async (userId) => {
    try {
      console.log('Загрузка фолловеров для ID:', userId);
      // Добавляем параметр для предотвращения кэширования
      const response = await fetch(`/api/twitch/user-followers?userId=${userId}&_=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include',
        mode: 'cors', // Добавляем режим CORS
        next: { revalidate: 0 } // Отключаем кэширование Next.js
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.followers) {
          setFollowers(data.followers || []);
          setTotalFollowers(data.total || data.followers.length || 0);
          console.log('Подписчики успешно загружены:', data.followers?.length || 0, 'Всего:', data.total || 0);
        } else {
          console.log('Данные фолловеров некорректные:', data);
          setFollowers([]);
          setTotalFollowers(0);
        }
      } else {
        console.error('Ошибка при получении подписчиков:', response.status);
        // Пробуем запасной метод
        fallbackLoadFollowers(userId);
      }
    } catch (error) {
      console.error('Ошибка при загрузке подписчиков:', error);
      // Пробуем запасной метод
      fallbackLoadFollowers(userId);
    }
  };

  // Запасной метод загрузки фолловеров
  const fallbackLoadFollowers = async (userId) => {
    try {
      console.log('Использую запасной метод загрузки фолловеров');
      const data = await getUserFollowers(userId);
      if (data && data.followers) {
        setFollowers(data.followers);
        setTotalFollowers(data.total || data.followers.length);
        console.log('Фолловеры загружены запасным методом:', data.followers.length);
      }
    } catch (fallbackError) {
      console.error('Запасной метод загрузки фолловеров тоже не сработал:', fallbackError);
    }
  };

  const loadFollowings = async (userId) => {
    try {
      console.log('Загрузка подписок для ID:', userId);
      // Добавляем параметр для предотвращения кэширования
      const response = await fetch(`/api/twitch/user-followings?userId=${userId}&_=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include',
        mode: 'cors', // Добавляем режим CORS
        next: { revalidate: 0 } // Отключаем кэширование Next.js
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.followings) {
          setFollowings(data.followings || []);
          setTotalFollowings(data.total || data.followings.length || 0);
          console.log('Подписки успешно загружены:', data.followings?.length || 0, 'Всего:', data.total || 0);
        } else {
          console.log('Данные подписок некорректные:', data);
          setFollowings([]);
          setTotalFollowings(0);
        }
      } else {
        console.error('Ошибка при получении подписок:', response.status);
        // Пробуем запасной метод
        fallbackLoadFollowings(userId);
      }
    } catch (error) {
      console.error('Ошибка при загрузке подписок:', error);
      // Пробуем запасной метод
      fallbackLoadFollowings(userId);
    }
  };

  // Запасной метод загрузки подписок
  const fallbackLoadFollowings = async (userId) => {
    try {
      console.log('Использую запасной метод загрузки подписок');
      const data = await getUserFollowings(userId);
      if (data && data.followings) {
        setFollowings(data.followings);
        setTotalFollowings(data.total || data.followings.length);
        console.log('Подписки загружены запасным методом:', data.followings.length);
      }
    } catch (fallbackError) {
      console.error('Запасной метод загрузки подписок тоже не сработал:', fallbackError);
    }
  };

  const loadStats = async (userId) => {
    try {
      console.log('Загрузка статистики пользователя для:', userId);
      // Добавляем параметр для предотвращения кэширования
      const response = await fetch(`/api/twitch/user-stats?userId=${userId}&_=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include',
        mode: 'cors', // Добавляем режим CORS 
        next: { revalidate: 0 } // Отключаем кэширование Next.js
      });
      
      if (response.ok) {
        const stats = await response.json();
        console.log('Статистика пользователя успешно загружена:', stats);
        
        // Проверяем, что данные имеют правильную структуру
        if (stats && (stats.user || stats.followers)) {
          setUserStats(stats);
          
          // Обновляем количество завершенных стримов, если есть данные
          if (stats.stream && typeof stats.stream.completedStreams === 'number') {
            setStreamsCompleted(stats.stream.completedStreams);
          }
        } else {
          console.warn('Данные статистики получены, но имеют неожиданную структуру:', stats);
          
          // Создаем базовый объект статистики, если данные неполные
          const fallbackStats = {
            user: stats.user || { viewCount: profileData.view_count || 0 },
            followers: stats.followers || { total: totalFollowers || followers.length || 0 },
            stream: stats.stream || {}
          };
          
          setUserStats(fallbackStats);
        }
      } else {
        console.error('Ошибка при загрузке статистики пользователя:', response.status);
      }
    } catch (error) {
      console.error('Ошибка при получении статистики пользователя:', error);
      
      // Создаем базовый объект статистики из имеющихся данных профиля
      if (profileData) {
        const fallbackStats = {
          user: { 
            viewCount: profileData.view_count || 0,
            broadcasterType: profileData.broadcaster_type || 'standard',
            createdAt: profileData.created_at
          },
          followers: { 
            total: totalFollowers || followers.length || 0 
          },
          stream: {}
        };
        
        setUserStats(fallbackStats);
      }
    }
  };

  const loadSocialLinks = async (userId) => {
    try {
      console.log('Загрузка социальных ссылок для:', userId);
      // Добавляем параметр для предотвращения кэширования
      const response = await fetch(`/api/twitch/social?userId=${userId}&_=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include',
        mode: 'cors', // Добавляем режим CORS
        next: { revalidate: 0 } // Отключаем кэширование Next.js
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Социальные ссылки успешно загружены:', data);
        
        // Проверяем структуру данных
        if (data) {
          if (Array.isArray(data)) {
            // Преобразуем данные в формат, который ожидает наш интерфейс
            const links = {};
            data.forEach(link => {
              if (link.name && link.url) {
                links[link.name] = link.url;
              }
            });
            
            setSocialLinks(links);
          } else if (typeof data === 'object') {
            // Данные уже в нужном формате
            setSocialLinks(data);
          } else {
            console.warn('Неожиданный формат данных социальных ссылок:', data);
          }
        }
      } else {
        console.error('Ошибка при загрузке социальных ссылок:', response.status);
        
        // Пробуем получить данные из localStorage
        try {
          const storedLinks = localStorage.getItem('social_links');
          if (storedLinks) {
            const links = JSON.parse(storedLinks);
            setSocialLinks(links);
            console.log('Социальные ссылки загружены из localStorage');
          }
        } catch (storageError) {
          console.error('Ошибка при получении социальных ссылок из localStorage:', storageError);
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке социальных ссылок:', error);
      
      // Пробуем получить данные из localStorage
      try {
        const storedLinks = localStorage.getItem('social_links');
        if (storedLinks) {
          const links = JSON.parse(storedLinks);
          setSocialLinks(links);
          console.log('Социальные ссылки загружены из localStorage');
        }
      } catch (storageError) {
        console.error('Ошибка при получении социальных ссылок из localStorage:', storageError);
      }
    }
  };

  const loadTierlists = async (userId) => {
    try {
      console.log('Загрузка тирлистов для:', userId);
      // Добавляем параметр для предотвращения кэширования
      const response = await fetch(`/api/tierlists?userId=${userId}&_=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include',
        mode: 'cors', // Добавляем режим CORS
        next: { revalidate: 0 } // Отключаем кэширование Next.js
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Тирлисты успешно загружены:', data?.length || 0);
        
        if (Array.isArray(data)) {
          setTierlists(data);
        } else {
          console.warn('Неожиданный формат данных тирлистов:', data);
          setTierlists([]);
        }
      } else {
        console.error('Ошибка при загрузке тирлистов:', response.status);
        setTierlists([]);
      }
    } catch (error) {
      console.error('Ошибка при загрузке тирлистов:', error);
      setTierlists([]);
    }
  };

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    let isMounted = true; // Для предотвращения обновления unmounted компонента
    
    try {
      console.log('[Vercel] Профиль: начало инициализации', { 
        isInitialized, 
        isAuthenticated, 
        userId 
      });
      
      // Если AuthContext еще не инициализирован, ждем
      if (!isInitialized) {
        console.log('[Vercel] AuthContext еще не инициализирован, ожидаем...');
        return; // Выходим из эффекта и ждем следующего рендера
      }
      
      // Проверяем есть ли данные авторизации в localStorage даже если контекст еще не обновил состояние
      const checkLocalStorage = () => {
        try {
          const isAuthFromStorage = localStorage.getItem('is_authenticated') === 'true';
          const storedUserData = localStorage.getItem('twitch_user');
          
          if (isAuthFromStorage && storedUserData) {
            try {
              const userData = JSON.parse(storedUserData);
              console.log('[Vercel] Найдены локальные данные авторизации:', userData.id);
              return true;
            } catch (error) {
              console.error('[Vercel] Ошибка при парсинге данных пользователя:', error);
            }
          }
          return false;
        } catch (error) {
          console.error('[Vercel] Ошибка при проверке localStorage:', error);
          return false;
        }
      };
      
      // Если контекст говорит, что пользователь не авторизован, 
      // но в localStorage есть данные, установим флаг для загрузки профиля
      const hasLocalData = !isAuthenticated && checkLocalStorage();
      
      // Функция для загрузки данных профиля с обработкой ошибок для Vercel
      const loadProfileData = async () => {
        if (!isMounted) return;
        
        try {
          setLoading(true);
          setError(null);
          
          // Проверяем, есть ли флаг авторизации в localStorage
          const isAuthenticatedInStorage = localStorage.getItem('is_authenticated') === 'true';
          console.log('Состояние авторизации:', { 
            isAuthenticated, 
            isAuthenticatedInStorage, 
            userIdFromContext: userId,
            hasLocalData
          });
          
          // Проверка авторизации с надежной обработкой ошибок для Vercel
          // Если пользователь не авторизован по состоянию из контекста и нет флага в localStorage
          if (!isAuthenticated && !isAuthenticatedInStorage && !hasLocalData) {
            console.log('[Vercel] Пользователь не авторизован, перенаправляем на страницу авторизации');
            
            // Сохраняем текущий путь
            try {
              localStorage.setItem('auth_redirect', '/profile');
            } catch (storageError) {
              console.warn('[Vercel] Ошибка при записи в localStorage:', storageError);
            }
            
            // Перенаправляем на страницу авторизации
            router.push('/auth');
            return;
          }
          
          // Проверяем, есть ли userId в localStorage
          let userIdFromStorage = null;
          let userDataFromStorage = null;
          
          try {
            const storedUserData = localStorage.getItem('twitch_user');
            if (storedUserData) {
              try {
                userDataFromStorage = JSON.parse(storedUserData);
                userIdFromStorage = userDataFromStorage?.id;
                console.log('Найдены данные пользователя в localStorage:', 
                  userIdFromStorage ? `ID: ${userIdFromStorage}` : 'ID не найден');
              } catch (parseError) {
                console.error('Ошибка при парсинге данных пользователя из localStorage:', parseError);
                
                // Если данные повреждены, попробуем другие ключи в localStorage
                const alternativeUserData = localStorage.getItem('cookie_twitch_user');
                if (alternativeUserData) {
                  try {
                    userDataFromStorage = JSON.parse(alternativeUserData);
                    userIdFromStorage = userDataFromStorage?.id;
                    console.log('Найдены альтернативные данные пользователя в localStorage:', 
                      userIdFromStorage ? `ID: ${userIdFromStorage}` : 'ID не найден');
                  } catch (altParseError) {
                    console.error('Ошибка при парсинге альтернативных данных пользователя:', altParseError);
                  }
                }
              }
            } else {
              // Если данных нет под ключом 'twitch_user', проверяем другие возможные ключи
              const alternativeUserData = localStorage.getItem('cookie_twitch_user');
              if (alternativeUserData) {
                try {
                  userDataFromStorage = JSON.parse(alternativeUserData);
                  userIdFromStorage = userDataFromStorage?.id;
                  console.log('Найдены альтернативные данные пользователя в localStorage:', 
                    userIdFromStorage ? `ID: ${userIdFromStorage}` : 'ID не найден');
                } catch (altParseError) {
                  console.error('Ошибка при парсинге альтернативных данных пользователя:', altParseError);
                }
              }
            }
          } catch (error) {
            console.error('Ошибка при получении данных из localStorage:', error);
          }
          
          // Используем ID из контекста или localStorage
          const effectiveUserId = userId || userIdFromStorage;
          
          if (!effectiveUserId) {
            console.error('Не удалось получить ID пользователя ни из контекста, ни из localStorage');
            setError('Не удалось определить идентификатор пользователя. Попробуйте войти заново.');
            setLoading(false);
            return;
          }
          
          console.log('Использую ID пользователя:', effectiveUserId);
          
          // Если у нас есть данные из контекста авторизации, используем их
          if (userId && userLogin) {
            console.log('Используем данные из контекста авторизации:', userId);
            
            // Создаем базовый объект данных из контекста
            const authContextData = {
              id: userId,
              login: userLogin,
              profile_image_url: userAvatar,
              display_name: userLogin
            };
            
            setProfileData(authContextData);
            console.log('Установлены данные профиля из контекста авторизации');
            
            // Загружаем дополнительные данные по очереди, чтобы избежать гонки запросов
            await loadFollowers(userId);
            await loadFollowings(userId);
            await loadStats(userId);
            await loadSocialLinks(userId);
            await loadTierlists(userId);
          } else if (userDataFromStorage && userIdFromStorage) {
            console.log('Используем данные из localStorage:', userIdFromStorage);
            
            setProfileData(userDataFromStorage);
            
            // Загружаем дополнительные данные по очереди, чтобы избежать гонки запросов
            await loadFollowers(userIdFromStorage);
            await loadFollowings(userIdFromStorage);
            await loadStats(userIdFromStorage);
            await loadSocialLinks(userIdFromStorage);
            await loadTierlists(userIdFromStorage);
          } else {
            console.log('Пытаемся получить данные с сервера');
            
            // Пробуем получить данные с сервера
            const freshUserData = await getUserData();
            
            if (freshUserData && freshUserData.id) {
              console.log('Получены свежие данные пользователя с сервера:', freshUserData.id);
              
              setProfileData(freshUserData);
              
              // Загружаем дополнительные данные по очереди, чтобы избежать гонки запросов
              await loadFollowers(freshUserData.id);
              await loadFollowings(freshUserData.id);
              await loadStats(freshUserData.id);
              await loadSocialLinks(freshUserData.id);
              await loadTierlists(freshUserData.id);
              
              // Сохраняем данные в localStorage для будущего использования
              localStorage.setItem('twitch_user', JSON.stringify(freshUserData));
              localStorage.setItem('is_authenticated', 'true');
            } else {
              console.error('Не удалось получить данные пользователя ни из одного источника');
              
              // Проверяем еще раз флаг авторизации
              if (!isAuthenticatedInStorage) {
                console.log('Перенаправляем на страницу авторизации из-за отсутствия данных');
                localStorage.setItem('auth_redirect', '/profile');
                router.push('/auth');
                return;
              } else {
                setError('Данные пользователя не найдены. Попробуйте обновить страницу или войти заново.');
              }
            }
          }
        } catch (error) {
          console.error('Необработанная ошибка при загрузке профиля:', error);
          setError('Произошла ошибка при загрузке профиля. Пожалуйста, попробуйте позже.');
        } finally {
          if (isMounted) {
            setLoading(false);
            setLoadAttempts(prev => prev + 1);
          }
        }
      };
      
      // Запускаем загрузку данных
      loadProfileData();
    } catch (error) {
      console.error('Критическая ошибка в useEffect профиля:', error);
      setError('Произошла критическая ошибка. Пожалуйста, обновите страницу.');
      setLoading(false);
    }
    
    // Очистка при размонтировании компонента
    return () => {
      isMounted = false;
    };
  }, [isInitialized, isAuthenticated, userId, userLogin, userAvatar, router]);

  // Функция для сохранения настроек видимости статистики
  const saveStatsVisibility = async (newVisibility) => {
    setStatsVisibility(newVisibility);
    await DataStorage.saveData('stats_visibility', newVisibility);
  };
  
  // Функция для сохранения социальных ссылок
  const saveSocialLinks = async (newLinks) => {
    try {
      setSocialLinks(newLinks);
      
      // Сохраняем в localStorage
      localStorage.setItem('social_links', JSON.stringify(newLinks));
      
      // Отправляем на сервер, если пользователь авторизован
      if (isAuthenticated && userId) {
        const accessToken = Cookies.get('twitch_access_token');
        if (!accessToken) {
          console.warn('Отсутствует токен доступа для сохранения социальных ссылок');
        return;
      }
      
        const response = await fetch('/api/twitch/social', {
          method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
          body: JSON.stringify({
            userId,
            links: newLinks
      })
        });
        
        if (!response.ok) {
          throw new Error(`Ошибка при сохранении социальных ссылок: ${response.status}`);
        }
        
        console.log('Социальные ссылки успешно сохранены на сервере');
      }
    } catch (error) {
      console.error('Ошибка при сохранении социальных ссылок:', error);
      alert('Не удалось сохранить социальные ссылки. Пожалуйста, попробуйте позже.');
    }
  };

  // Если данные загружаются, не показываем экран загрузки, а рендерим контейнер с плавной анимацией
  if (loading && !profileData) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.profileHeader}>
          <h1>Загрузка профиля...</h1>
        </div>
      </div>
    );
  }

  // Функция для перезагрузки страницы
  const retryLoading = () => {
    window.location.reload();
  };

  // Если произошла ошибка, показываем сообщение об ошибке
  if (error) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.error}>
          <h2>Произошла ошибка</h2>
          <p>{error}</p>
          <button onClick={retryLoading} className={styles.button}>
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  // Если данные профиля отсутствуют, показываем сообщение
  if (!profileData) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.profileHeader}>
          <h2>Загрузка профиля...</h2>
        </div>
      </div>
    );
  }

  // Функция для выхода из аккаунта
  const handleLogout = () => {
    try {
      console.log('Выполняем выход из аккаунта (клиентская версия)...');
      
      // 1. Очищаем все cookies, используя document.cookie напрямую
      if (typeof document !== 'undefined') {
        document.cookie = 'twitch_access_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        document.cookie = 'twitch_refresh_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        document.cookie = 'twitch_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        document.cookie = 'twitch_user=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        document.cookie = 'twitch_auth_state=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        
        // Для надежности пробуем еще с secure и domain
        document.cookie = 'twitch_access_token=; Path=/; Domain='+window.location.hostname+'; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Secure;';
        document.cookie = 'twitch_refresh_token=; Path=/; Domain='+window.location.hostname+'; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Secure;';
        document.cookie = 'twitch_token=; Path=/; Domain='+window.location.hostname+'; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Secure;';
        document.cookie = 'twitch_user=; Path=/; Domain='+window.location.hostname+'; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Secure;';
        document.cookie = 'twitch_auth_state=; Path=/; Domain='+window.location.hostname+'; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Secure;';
      }
      
      // 2. Очищаем все переменные в localStorage
      localStorage.removeItem('twitch_user');
      localStorage.removeItem('twitch_token');
      localStorage.removeItem('cookie_twitch_access_token');
      localStorage.removeItem('cookie_twitch_refresh_token');
      localStorage.removeItem('cookie_twitch_user');
      localStorage.removeItem('is_authenticated');
      
      // Очищаем другие потенциальные данные аутентификации
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes('twitch') || 
          key.includes('auth') || 
          key.includes('token') || 
          key.includes('user') ||
          key.includes('login')
        )) {
          keysToRemove.push(key);
        }
      }
      
      // Удаляем найденные ключи
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      // 3. Очищаем sessionStorage
      sessionStorage.clear();
      
      console.log('Все данные аутентификации успешно удалены');
      
      // 4. Устанавливаем признак выхода в localStorage
      localStorage.setItem('logged_out', 'true');
      
      // 5. Перенаправляем на страницу авторизации с параметром, указывающим на выход
      window.location.href = '/auth?logged_out=true';
    } catch (error) {
      console.error('Ошибка при выходе из аккаунта:', error);
      
      // В случае ошибки всё равно пытаемся перенаправить на страницу авторизации
      alert('Произошла ошибка при выходе из аккаунта. Вы будете перенаправлены на страницу авторизации.');
      window.location.href = '/auth';
    }
  };

  // Обновляем функцию для отображения информации о профиле
  const renderProfileInfo = () => {
    if (!profileData) return null;
    
    // Получаем количество фолловеров из разных источников данных
    const followersCount = totalFollowers || 
                          userStats?.followers?.total || 
                          profileData.follower_count || 
                          profileData.followersCount || 
                          followers.length || 
                          0;
    
    // Получаем количество просмотров
    const viewCount = userStats?.user?.viewCount || 
                     profileData.view_count || 
                     profileData.viewCount || 
                     0;
    
    // Переводим тип канала на русский
    const getBroadcasterTypeInRussian = (type) => {
      switch(type) {
        case 'affiliate': return 'Компаньон';
        case 'partner': return 'Партнер';
        default: return type || 'Стандартный';
      }
    };
    
    return (
      <div className={styles.profileInfoContainer}>
        <div className={styles.profileHeader}>
          <div className={styles.avatarContainer}>
            <CyberAvatar 
              src={profileData.profile_image_url || '/images/default-avatar.png'} 
              alt={profileData.display_name || 'Пользователь'} 
              size={150}
              className={styles.profileAvatar}
            />
          </div>
          <div className={styles.profileDetails}>
            <h1 className={styles.displayName}>{profileData.display_name || profileData.login}</h1>
            <div className={styles.profileStats}>
              <div className={styles.profileStat}>
                <span className={styles.statIcon}>👥</span>
                <span className={styles.statValue}>{followersCount.toLocaleString('ru-RU')}</span>
                <span className={styles.statLabel}>Подписчиков</span>
              </div>
              {viewCount > 0 && (
                <div className={styles.profileStat}>
                  <span className={styles.statIcon}>👁️</span>
                  <span className={styles.statValue}>{viewCount.toLocaleString('ru-RU')}</span>
                  <span className={styles.statLabel}>Просмотров</span>
                </div>
              )}
              {profileData.broadcaster_type && (
                <div className={styles.profileStat}>
                  <span className={styles.statIcon}>📺</span>
                  <span className={styles.statValue}>{getBroadcasterTypeInRussian(profileData.broadcaster_type)}</span>
                  <span className={styles.statLabel}>Тип канала</span>
                </div>
              )}
            </div>
            {profileData.birthday && (
              <div className={styles.birthdayContainer}>
                <span className={styles.birthdayIcon}>🎂</span>
                <span className={styles.birthdayText}>День рождения: {formatDate(profileData.birthday)}</span>
              </div>
            )}
          </div>
          <div className={styles.profileActions}>
            <button 
              className={styles.achievementsButton} 
              onClick={toggleAchievements}
              title="Посмотреть достижения"
            >
              🏆 Достижения
            </button>
            <button 
              className={styles.reviewsButton} 
              onClick={toggleReviews}
              title="Отзывы о вас"
            >
              ⭐ Отзывы
            </button>
            <button 
              className={styles.tierlistButton} 
              onClick={toggleTierlists}
              title="Тирлисты пользователя"
            >
              📋 Тирлисты
            </button>
            <button 
              className={styles.statsButton} 
              onClick={toggleStats}
              title="Статистика канала"
            >
              📊 Статистика
            </button>
            <button 
              className={styles.scheduleButton} 
              onClick={() => router.push('/schedule')}
              title="Расписание трансляций"
            >
              📅 Расписание
            </button>
            <button className={styles.button} onClick={() => router.push('/edit-profile')}>
              Редактировать профиль
            </button>
            <button className={styles.button} onClick={() => router.push('/menu')}>
              Вернуться в меню
            </button>
            <button className={styles.logoutButton} onClick={handleLogout}>
              Выйти из аккаунта
            </button>
          </div>
        </div>
        
        {showAchievements ? (
          <div className={styles.achievementsSection}>
            <div className={styles.sectionHeader}>
              <h2>Достижения</h2>
            </div>
            <AchievementsSystem 
              userId={profileData.id}
              streamsCompleted={streamsCompleted}
              hasCollaborations={hasCollaborations}
            />
          </div>
        ) : showReviews ? (
          <div className={styles.reviewsContainer}>
            <div className={styles.sectionHeader}>
              <h2>Отзывы о вас</h2>
            </div>
            <ReviewSection 
              userId={profileData.id} 
              onReviewAdded={() => {
                // Обновляем данные профиля после добавления отзыва
                const updateAfterReview = async () => {
                  try {
                    setLoading(true);
                    const userData = await getUserData();
                    if (userData && userData.id) {
                      setProfileData(userData);
                    }
                  } catch (error) {
                    console.error('Ошибка при обновлении данных после добавления отзыва:', error);
                  } finally {
                    setLoading(false);
                  }
                };
                
                updateAfterReview();
              }}
            />
          </div>
        ) : showStats ? (
          <div className={styles.statsContainer}>
            <div className={styles.sectionHeader}>
              <h2>Статистика канала</h2>
              <div className={styles.statsActions}>
                {statsVisibility.followers && (
                  <button 
                    className={styles.statsActionButton}
                    onClick={toggleFollowers}
                  >
                    👥 Подписчики
                  </button>
                )}
                
                {statsVisibility.followings && (
                  <button 
                    className={styles.statsActionButton}
                    onClick={toggleFollowings}
                  >
                    📺 Подписки
                  </button>
                )}
                
                {statsVisibility.streams && (
                  <button 
                    className={styles.statsActionButton}
                    onClick={toggleStreams}
                  >
                    🎬 Стримы
                  </button>
                )}
              </div>
            </div>
            
            {renderChannelStats()}
            {renderAccountInfo()}
          </div>
        ) : showFollowers ? (
          <div className={styles.sectionContainer}>
            <h2 className={styles.sectionTitle}>Фолловеры</h2>
            {(!followers || followers.length === 0) ? (
              <div className={styles.emptyState}>
                <p>У вас пока нет фолловеров</p>
                <button 
                  className={styles.button}
                  onClick={refreshFollowers}
                  style={{ marginTop: '15px' }}
                >
                  Обновить данные
                </button>
              </div>
            ) : (
              <div className={styles.followersGrid}>
                {followers.map((follower, index) => (
                  <div key={follower.id || `follower-${index}`} className={styles.followerCard}>
                    {/* Бейдж для зарегистрированных пользователей */}
                    {follower.isRegisteredOnSU && follower.suUserType === 'streamer' && (
                      <span className={styles.streamerBadge}>Стример SU</span>
                    )}
                    {follower.isRegisteredOnSU && follower.suUserType !== 'streamer' && (
                      <span className={styles.registeredBadge}>SU</span>
                    )}
                    
                    <img 
                      src={follower.profile_image_url || follower.profileImageUrl || '/images/default-avatar.png'} 
                      alt={follower.display_name || follower.name || follower.login || 'Фолловер'} 
                      className={styles.followerAvatar}
                    />
                    <div className={styles.followerName}>
                      {follower.display_name || follower.name || follower.login || `Пользователь ${index + 1}`}
                    </div>
                    <button 
                      className={styles.viewProfileButton}
                      onClick={() => window.open(`https://twitch.tv/${follower.login}`, '_blank')}
                    >
                      Профиль
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button className={styles.sectionToggleButton} onClick={() => setShowFollowers(false)}>
              Скрыть фолловеров
            </button>
          </div>
        ) : showFollowings ? (
          <div className={styles.sectionContainer}>
            <h2 className={styles.sectionTitle}>Подписки</h2>
            {renderRecentFollowings()}
            <button className={styles.sectionToggleButton} onClick={() => setShowFollowings(false)}>
              Скрыть подписки
            </button>
          </div>
        ) : showStreams ? (
          <div className={styles.streamsContainer}>
            <div className={styles.sectionHeader}>
              <h2>Ваши стримы</h2>
              <div className={styles.statsActions}>
                <button 
                  className={styles.statsActionButton}
                  onClick={() => setShowStats(true)}
                >
                  📊 К статистике
                </button>
              </div>
            </div>
            {renderRecentStreams()}
          </div>
        ) : showTierlists ? (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Тирлисты</h2>
              <button className={styles.backToProfileButton} onClick={toggleTierlists}>
                <i className="fas fa-arrow-left"></i> Вернуться
              </button>
            </div>
            
            {renderTierlists()}
          </div>
        ) : (
          <>
            {/* Отображаем описание и социальные сети только если не показываем другие секции */}
            <div className={styles.profileInfoSection}>
              {/* Отображаем описание профиля */}
              {(socialLinks && socialLinks.description) || profileData.description ? (
                <div className={styles.profileDescription}>
                  <h3 className={styles.sectionTitle}>Описание</h3>
                  <p>{socialLinks?.description || profileData.description}</p>
                </div>
              ) : (
                isAuthenticated && userId === profileData?.id && (
                  <div className={styles.emptyDescription}>
                    <p>Нет описания профиля.</p>
                    <p>Добавьте его в разделе "Редактировать профиль".</p>
                  </div>
                )
              )}
              
              {/* Отображаем социальные сети */}
              <div className={styles.socialLinksSection}>
                <h3 className={styles.sectionTitle}>Социальные сети</h3>
                {renderSocialLinks()}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // Обновляем функцию для отображения социальных ссылок
  const renderSocialLinks = () => {
    // Проверяем, существуют ли социальные ссылки
    if (!socialLinks) {
      console.warn('Социальные ссылки не найдены');
      return (
        <div className={styles.emptySocialLinks}>
          Нет социальных ссылок для отображения.
          {isAuthenticated && userId === profileData?.id && (
            <p>Добавьте их в разделе "Редактировать профиль".</p>
          )}
        </div>
      );
    }
    
    // Проверяем, есть ли хотя бы одна социальная ссылка
    const hasSocialLinks = 
      socialLinks.twitch || 
      socialLinks.youtube || 
      socialLinks.discord || 
      socialLinks.telegram || 
      socialLinks.vk || 
      (socialLinks.isMusician && socialLinks.yandexMusic);
    
    if (!hasSocialLinks) {
      return (
        <div className={styles.emptySocialLinks}>
          Нет социальных ссылок для отображения.
          {isAuthenticated && userId === profileData?.id && (
            <p>Добавьте их в разделе "Редактировать профиль".</p>
          )}
        </div>
      );
    }
    
    // Отображаем социальные кнопки
    return (
      <div className={styles.socialLinks}>
        {socialLinks.twitch && (
          <SocialButton 
            type="twitch" 
            url={socialLinks.twitch} 
            username={socialLinks.twitch.split('/').pop() || 'username'} 
          />
        )}
        
        {socialLinks.youtube && (
          <SocialButton 
            type="youtube" 
            url={socialLinks.youtube} 
            username={socialLinks.youtube.split('/').pop() || 'username'} 
          />
        )}
        
        {socialLinks.discord && (
          <SocialButton 
            type="discord" 
            url={socialLinks.discord} 
            username={socialLinks.discord.split('/').pop() || 'username'} 
          />
        )}
        
        {socialLinks.telegram && (
          <SocialButton 
            type="telegram" 
            url={socialLinks.telegram} 
            username={socialLinks.telegram.split('/').pop() || 'username'} 
          />
        )}
        
        {socialLinks.vk && (
          <SocialButton 
            type="vk" 
            url={socialLinks.vk} 
            username={socialLinks.vk.split('/').pop() || 'username'} 
          />
        )}
        
        {socialLinks.isMusician && socialLinks.yandexMusic && (
          <SocialButton 
            type="yandexMusic" 
            url={socialLinks.yandexMusic} 
            username={socialLinks.yandexMusic.split('/').pop() || 'username'} 
          />
        )}
      </div>
    );
  };

  // Функция для переключения отображения достижений
  const toggleAchievements = () => {
    setShowAchievements(!showAchievements);
    setShowReviews(false);
    setShowStats(false);
    setShowFollowers(false);
    setShowFollowings(false);
    setShowStreams(false);
  };
  
  // Функция для переключения отображения отзывов
  const toggleReviews = () => {
    setShowReviews(!showReviews);
    setShowAchievements(false);
    setShowStats(false);
    setShowFollowers(false);
    setShowFollowings(false);
    setShowStreams(false);
  };
  
  // Функция для переключения отображения статистики
  const toggleStats = () => {
    setShowStats(!showStats);
    setShowAchievements(false);
    setShowReviews(false);
    setShowFollowers(false);
    setShowFollowings(false);
    setShowStreams(false);
  };
  
  // Функция для переключения отображения подписчиков
  const toggleFollowers = () => {
    setShowFollowers(!showFollowers);
    setShowAchievements(false);
    setShowReviews(false);
    setShowStats(false);
    setShowFollowings(false);
    setShowStreams(false);
  };
  
  // Функция для переключения отображения подписок
  const toggleFollowings = () => {
    setShowFollowings(!showFollowings);
    setShowAchievements(false);
    setShowReviews(false);
    setShowStats(false);
    setShowFollowers(false);
    setShowStreams(false);
  };
  
  // Функция для переключения отображения стримов
  const toggleStreams = () => {
    setShowStreams(!showStreams);
    setShowAchievements(false);
    setShowReviews(false);
    setShowStats(false);
    setShowFollowers(false);
    setShowFollowings(false);
  };

  // Функция для переключения отображения тирлистов
  const toggleTierlists = () => {
    setShowTierlists(!showTierlists);
    setShowAchievements(false);
    setShowReviews(false);
    setShowStats(false);
    setShowFollowers(false);
    setShowFollowings(false);
    setShowStreams(false);
  };

  // Функция для отображения статуса пользователя
  const renderUserStatus = () => {
    // Определяем статус стримера на основе данных профиля
    const isStreamerStatus = profileData?.isStreamer || 
                      profileData?.broadcaster_type === 'partner' || 
                      profileData?.broadcaster_type === 'affiliate' || 
                      (profileData?.follower_count && profileData.follower_count >= 265);
    
    // Получаем количество фолловеров из разных возможных источников
    const followerCount = 
      profileData?.follower_count || 
      (userStats?.followers?.total) || 
      (followers?.length) || 
      0;
    
    return (
      <div className={styles.statusContainer}>
        <span className={styles.statusText}>Статус:</span>
        <span className={styles.statusValue} style={{ color: isStreamerStatus ? '#9146FF' : '#4CAF50' }}>
          {isStreamerStatus ? 'Стример' : 'Зритель'}
        </span>
        <span className={styles.followersCount}>
          Фолловеров: {followerCount}
        </span>
      </div>
    );
  };

  // Функция для форматирования даты
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
  };
  
  // Функция для форматирования даты и времени
  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Функция для отображения дня рождения
  const renderBirthday = () => {
    if (!profileData?.birthday) return null;
    
    // Проверяем настройку видимости дня рождения
    const birthdayVisibility = localStorage.getItem(`birthday_visibility_${profileData.id}`);
    if (birthdayVisibility === 'false') return null;
    
    // Если сегодня день рождения, показываем поздравление
    if (isBirthday) {
      return (
        <div className={styles.birthdayContainer}>
          <span className={styles.birthdayIcon}>🎂</span>
          <span className={styles.birthdayText}>С днем рождения! +100 стример-коинов!</span>
        </div>
      );
    }
    
    // Если до дня рождения осталось меньше 7 дней, показываем обратный отсчет
    if (daysToBirthday !== null && daysToBirthday <= 7) {
      return (
        <div className={styles.birthdayContainer}>
          <span className={styles.birthdayIcon}>🎂</span>
          <span className={styles.birthdayText}>
            День рождения через {daysToBirthday} {getDayWord(daysToBirthday)}!
          </span>
        </div>
      );
    }
    
    // В остальных случаях просто показываем дату
    return (
      <div className={styles.birthdayContainer}>
        <span className={styles.birthdayIcon}>🎂</span>
        <span className={styles.birthdayText}>День рождения: {formatDate(profileData.birthday)}</span>
      </div>
    );
  };

  // Функция для склонения слова "день"
  const getDayWord = (days) => {
    if (days === 1) return 'день';
    if (days >= 2 && days <= 4) return 'дня';
    return 'дней';
  };

  // Функция для отображения статистики канала
  const renderChannelStats = () => {
    // Проверяем наличие реальных данных из разных источников
    const hasRealData = (userStats && userStats.user && typeof userStats.user.viewCount === 'number') || 
                       (profileData && (profileData.view_count || profileData.viewCount));
    
    // Если данных нет, показываем сообщение
    if (!hasRealData) {
      return (
        <div className={styles.statsSection}>
          <h3 className={styles.statsTitle}>Статистика канала</h3>
          <div className={styles.emptyState}>
            <p>Статистика временно недоступна из-за проблем с API Twitch.</p>
            <button 
              className={styles.button}
              onClick={() => window.location.reload()}
              style={{ marginTop: '15px' }}
            >
              Обновить данные
            </button>
          </div>
        </div>
      );
    }
    
    // Получаем количество просмотров из разных источников
    const viewCount = (userStats?.user?.viewCount) || 
                     profileData.view_count || 
                     profileData.viewCount || 
                     0;
    
    // Получаем количество фолловеров из разных источников
    const followersCount = totalFollowers || 
                          userStats?.followers?.total || 
                          profileData.follower_count || 
                          followers.length || 
                          0;
    
    // Рассчитываем средний онлайн (примерная формула)
    const completedStreamsCount = streamsCompleted || 0;
    const averageViewers = completedStreamsCount > 0 
      ? Math.round((viewCount * 0.05) / completedStreamsCount)
      : Math.round(viewCount * 0.005); // Примерная оценка если нет данных о стримах
    
    // Получаем дату создания аккаунта
    const createdAt = userStats?.user?.createdAt || profileData.created_at;
    
    // Рассчитываем возраст аккаунта
    let accountAge = '';
    if (createdAt) {
      const createdDate = new Date(createdAt);
      const now = new Date();
      const diffTime = Math.abs(now - createdDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const diffYears = Math.floor(diffDays / 365);
      const remainingDays = diffDays % 365;
      
      if (diffYears > 0) {
        accountAge = `${diffYears} ${getDeclension(diffYears, ['год', 'года', 'лет'])}`;
        if (remainingDays > 0) {
          accountAge += ` и ${remainingDays} ${getDeclension(remainingDays, ['день', 'дня', 'дней'])}`;
        }
      } else {
        accountAge = `${diffDays} ${getDeclension(diffDays, ['день', 'дня', 'дней'])}`;
      }
    }
    
    return (
      <div className={styles.statsSection}>
        <h3 className={styles.statsTitle}>Статистика канала</h3>
        
        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <div className={styles.statIcon}>👁️</div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{viewCount.toLocaleString('ru-RU')}</div>
              <div className={styles.statLabel}>Просмотров</div>
            </div>
          </div>
          
          <div className={styles.statItem}>
            <div className={styles.statIcon}>👥</div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{followersCount.toLocaleString('ru-RU')}</div>
              <div className={styles.statLabel}>Подписчиков</div>
            </div>
          </div>
          
          <div className={styles.statItem}>
            <div className={styles.statIcon}>📊</div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{averageViewers}</div>
              <div className={styles.statLabel}>Средний онлайн</div>
            </div>
          </div>
          
          <div className={styles.statItem}>
            <div className={styles.statIcon}>📺</div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{completedStreamsCount}</div>
              <div className={styles.statLabel}>Завершено стримов</div>
            </div>
          </div>
          
          {createdAt && (
            <div className={styles.statItem}>
              <div className={styles.statIcon}>📅</div>
              <div className={styles.statInfo}>
                <div className={styles.statValue}>{formatDate(createdAt)}</div>
                <div className={styles.statLabel}>Дата создания</div>
              </div>
            </div>
          )}
          
          {accountAge && (
            <div className={styles.statItem}>
              <div className={styles.statIcon}>⏳</div>
              <div className={styles.statInfo}>
                <div className={styles.statValue}>{accountAge}</div>
                <div className={styles.statLabel}>Возраст аккаунта</div>
              </div>
            </div>
          )}
          
          <div className={styles.statItem}>
            <div className={styles.statIcon}>🔍</div>
            <div className={styles.statInfo}>
              <a 
                href={`https://twitchtracker.com/${profileData?.login || userLogin}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.statLink}
              >
                <div className={styles.statValue}>Twitch Tracker</div>
                <div className={styles.statLabel}>Подробная статистика</div>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Функция для отображения информации об аккаунте
  const renderAccountInfo = () => {
    if (!statsVisibility.accountInfo) return null;
    
    // Получаем данные из разных источников
    const broadcasterType = userStats?.user?.broadcasterType || profileData.broadcaster_type;
    const description = profileData.description || socialLinks?.description;
    const email = profileData.email;
    const isPartner = broadcasterType === 'partner';
    const isAffiliate = broadcasterType === 'affiliate';
    const isVerified = profileData.verified;
    const language = profileData.language || profileData.broadcaster_language;
    
    // Получаем дату создания аккаунта
    const createdAt = userStats?.user?.createdAt || profileData.created_at;
    
    // Проверяем, есть ли хоть какие-то данные для отображения
    const hasAnyData = broadcasterType || description || email || createdAt || language;
    
    if (!hasAnyData) return null;
    
    return (
      <div className={styles.statsSection}>
        <h3 className={styles.statsTitle}>Информация об аккаунте</h3>
        
        <div className={styles.accountInfoList}>
          {createdAt && (
          <div className={styles.accountInfoItem}>
            <div className={styles.accountInfoLabel}>Дата создания:</div>
              <div className={styles.accountInfoValue}>{formatDate(createdAt)}</div>
          </div>
          )}
          
          {broadcasterType && (
          <div className={styles.accountInfoItem}>
              <div className={styles.accountInfoLabel}>Тип вещателя:</div>
              <div className={styles.accountInfoValue}>
                {isPartner ? 'Партнер' : 
                 isAffiliate ? 'Компаньон' : 
                 'Стандартный'}
          </div>
            </div>
          )}
          
          {language && (
            <div className={styles.accountInfoItem}>
              <div className={styles.accountInfoLabel}>Язык вещания:</div>
              <div className={styles.accountInfoValue}>
                {language === 'ru' ? 'Русский' : 
                 language === 'en' ? 'Английский' : 
                 language}
              </div>
            </div>
          )}
          
          {isVerified !== undefined && (
            <div className={styles.accountInfoItem}>
              <div className={styles.accountInfoLabel}>Верификация:</div>
              <div className={styles.accountInfoValue}>
                {isVerified ? 'Подтвержден ✓' : 'Не подтвержден'}
              </div>
            </div>
          )}
          
          {userStats?.stream?.isLive && (
            <div className={styles.accountInfoItem}>
              <div className={styles.accountInfoLabel}>Статус:</div>
              <div className={styles.accountInfoValue}>
                <span className={styles.liveStatus}>В эфире</span>
              </div>
            </div>
          )}
          
          {description && (
            <div className={styles.accountInfoItem}>
              <div className={styles.accountInfoLabel}>Описание:</div>
              <div className={styles.accountInfoValue}>
                <div className={styles.descriptionText}>{description}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Функция для отображения последних подписчиков
  const renderRecentFollowers = () => {
    console.log('Состояние userStats при отображении фолловеров:', userStats);
    
    if (!userStats || 
        !userStats.followers || 
        !userStats.followers.recentFollowers || 
        userStats.followers.recentFollowers.length === 0) {
      return (
        <div className={styles.emptyState}>
          <p>У вас пока нет подписчиков</p>
          {userStats?.followers?.total > 0 && (
            <button 
              className={styles.button}
              onClick={() => window.location.reload()}
              style={{ marginTop: '15px' }}
            >
              Обновить данные
            </button>
          )}
        </div>
      );
    }
    
    return (
      <div className={styles.usersList}>
        {userStats.followers.recentFollowers.map(follower => (
          <div key={follower.id} className={styles.userCard}>
            <img 
              src={follower.profileImageUrl || '/default-avatar.png'} 
              alt={follower.name} 
              className={styles.userAvatar}
            />
            <div className={styles.userInfo}>
              <div className={styles.userName}>{follower.name}</div>
              <div className={styles.userDate}>Подписался: {formatDate(follower.followedAt)}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Функция для отображения последних подписок
  const renderRecentFollowings = () => {
    return (
      <div>
        <h3>Недавние подписки</h3>
        {followings.length > 0 ? (
          <div className={styles.usersList}>
            {followings.slice(0, 10).map((following, index) => (
              <div key={index} className={styles.userCard}>
                <img 
                  src={following.profile_image_url || '/images/default-avatar.png'} 
                  alt={following.display_name || following.user_name} 
                  className={styles.followerAvatar}
                />
                <div className={styles.userInfo}>
                  <div className={styles.userName}>{following.display_name || following.user_name}</div>
                  <div className={styles.userDate}>
                    {following.followed_at ? new Date(following.followed_at).toLocaleDateString() : 'Нет данных'}
                  </div>
                </div>
                {following.isRegisteredInSU && (
                  <div className={styles.registeredBadge} title="Зарегистрирован в Streamers Universe">
                    SU
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            Вы еще не подписались ни на одного пользователя
          </div>
        )}
      </div>
    );
  };
  
  // Функция для отображения последних стримов
  const renderRecentStreams = () => {
    if (!userStats || !userStats.stream.recentStreams || userStats.stream.recentStreams.length === 0) {
      return (
        <div className={styles.emptyState}>
          <p>У вас пока нет записей стримов</p>
        </div>
      );
    }
    
    return (
      <div className={styles.streamsList}>
        {userStats.stream.recentStreams.map(stream => (
          <div key={stream.id} className={styles.streamCard}>
            <div className={styles.streamThumbnail}>
              <img 
                src={stream.thumbnailUrl.replace('{width}', '320').replace('{height}', '180')} 
                alt={stream.title} 
              />
              <div className={styles.streamViews}>
                <span className={styles.viewsIcon}>👁️</span>
                {stream.viewCount.toLocaleString('ru-RU')}
              </div>
              <div className={styles.streamDuration}>{stream.duration}</div>
            </div>
            <div className={styles.streamInfo}>
              <div className={styles.streamTitle}>{stream.title}</div>
              <div className={styles.streamDate}>{formatDateTime(stream.createdAt)}</div>
              <a 
                href={stream.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={styles.streamLink}
              >
                Смотреть запись
              </a>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Функция для отображения тирлистов
  const renderTierlists = () => {
    if (tierlists.length === 0) {
      return (
        <div className={styles.emptyState}>
          <p>У пользователя пока нет тирлистов.</p>
          {isAuthenticated && userId === profileData.id && (
            <p>Вы можете создать тирлист в разделе "Меню".</p>
          )}
        </div>
      );
    }
    
    return (
      <div className={styles.tierlistsGrid}>
        {tierlists.map(tierlist => (
          <div key={tierlist.id} className={styles.tierlistCard}>
            <h3 className={styles.tierlistTitle}>{tierlist.title}</h3>
            <div className={styles.tierlistCategory}>{tierlist.category}</div>
            <div className={styles.tierlistItems}>
              {tierlist.itemCount} элементов
            </div>
            <div className={styles.tierlistDate}>
              Создан: {formatDate(tierlist.createdAt)}
            </div>
            <a 
              href={`/tierlists/${tierlist.id}`} 
              className={styles.viewTierlistButton}
            >
              Посмотреть
            </a>
          </div>
        ))}
      </div>
    );
  };
  
  // Функция для склонения слов
  const getDeclension = (number, words) => {
    const cases = [2, 0, 1, 1, 1, 2];
    return words[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]];
  };

  // Функция для принудительного обновления фолловеров
  const refreshFollowers = async () => {
    setLoading(true);
    try {
      if (!profileData || !profileData.id) {
        console.error('Нет данных пользователя для обновления фолловеров');
        return;
      }
      
      console.log('Принудительное обновление данных о фолловерах для ID:', profileData.id);
      
      // Используем fetchWithTokenRefresh из twitchAPI.js
      const refreshedData = await fetchWithTokenRefresh(
        `/api/twitch/refresh-followers?userId=${profileData.id}`,
        {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        },
        false // Не использовать кэш
      );
      
      console.log('Получены обновленные данные фолловеров:', refreshedData);
      
      if (refreshedData.success && refreshedData.followers) {
        setFollowers(refreshedData.followers);
      } else {
        console.warn('Ошибка при обновлении фолловеров:', refreshedData.error);
      }
    } catch (error) {
      console.error('Ошибка при обновлении фолловеров:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserAvatar = () => {
    if (!profileData) return '/default-avatar.png';
    
    // Проверяем различные варианты хранения URL аватара
    if (profileData.profile_image_url) {
      return profileData.profile_image_url;
    } else if (profileData.profileImageUrl) {
      return profileData.profileImageUrl;
    } else if (userAvatar) {
      return userAvatar;
    }
    
    return '/default-avatar.png';
  };

  // Добавляем эффект для обновления данных при возвращении на страницу
  useEffect(() => {
    // Функция для проверки, были ли обновлены данные профиля
    const checkForProfileUpdates = () => {
      const lastEditTime = localStorage.getItem('profile_last_edit_time');
      const currentProfileUpdateTime = localStorage.getItem('profile_update_timestamp');
      
      if (lastEditTime && (!currentProfileUpdateTime || lastEditTime > currentProfileUpdateTime)) {
        console.log('Обнаружены изменения в профиле, обновляем данные...');
        
        // Определяем функцию обновления данных внутри useEffect
        const updateProfileData = async () => {
          try {
            setLoading(true);
            setError(null);
            
            // Загружаем данные профиля
            const userData = await getUserData();
            
            if (userData && userData.id) {
              setProfileData(userData);
              
              // Загружаем дополнительные данные
              if (userData.id) {
                try {
                  const followersData = await getUserFollowers(userData.id);
                  if (followersData && followersData.followers) {
                    setFollowers(followersData.followers);
                  }
                  
                  const followingsData = await getUserFollowings(userData.id);
                  if (followingsData && followingsData.followings) {
                    setFollowings(followingsData.followings);
                  }
                } catch (dataError) {
                  console.error('Ошибка при загрузке дополнительных данных:', dataError);
                }
              }
            }
          } catch (error) {
            console.error('Ошибка при обновлении данных профиля:', error);
          } finally {
            setLoading(false);
          }
        };
        
        updateProfileData();
        localStorage.setItem('profile_update_timestamp', Date.now().toString());
      }
    };
    
    // Проверяем обновления при монтировании компонента
    checkForProfileUpdates();
    
    // Добавляем обработчик события для проверки обновлений при фокусе на окне
    const handleFocus = () => {
      checkForProfileUpdates();
    };
    
    window.addEventListener('focus', handleFocus);
    
    // Очищаем обработчик при размонтировании
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Функция для отображения отзывов
  const renderReviews = () => {
    if (!showReviews) return null;

    return (
      <div className={styles.reviewsContainer}>
        <div className={styles.sectionHeader}>
          <h2>Отзывы о вас</h2>
        </div>
        <ReviewSection 
          userId={profileData.id} 
          onReviewAdded={() => {
            // Обновляем данные профиля после добавления отзыва
            const updateAfterReview = async () => {
              try {
                setLoading(true);
                const userData = await getUserData();
                if (userData && userData.id) {
                  setProfileData(userData);
                }
              } catch (error) {
                console.error('Ошибка при обновлении данных после добавления отзыва:', error);
              } finally {
                setLoading(false);
              }
            };
            
            updateAfterReview();
          }}
        />
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Загрузка профиля...</p>
        </div>
      ) : error ? (
        <div className={styles.errorContainer}>
          <h2>Ошибка при загрузке профиля</h2>
          <p>{error}</p>
          <div className={styles.errorActions}>
            <button className={styles.button} onClick={() => window.location.reload()}>
              Попробовать снова
            </button>
            <button className={styles.button} onClick={() => router.push('/menu')}>
              Вернуться в меню
            </button>
          </div>
        </div>
      ) : (
        renderProfileInfo()
      )}
    </div>
  );
} 