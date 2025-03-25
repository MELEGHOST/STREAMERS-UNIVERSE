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
import Cookies from 'js-cookie';
import CyberAvatar from '../components/CyberAvatar';

export default function Profile() {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [userLogin, setUserLogin] = useState('');
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
  const [totalFollowers, setTotalFollowers] = useState(0);
  const [totalFollowings, setTotalFollowings] = useState(0);

  // Упрощенная функция для получения данных пользователя
  const fetchUserData = async (forceRefresh = false) => {
    try {
      console.log('Начало загрузки данных пользователя...');
      
      // Проверяем наличие параметра refresh в URL
      const urlParams = new URLSearchParams(window.location.search);
      const refreshParam = urlParams.get('refresh');
      
      // Если параметр refresh есть или передан forceRefresh, не используем кэш
      const shouldRefresh = forceRefresh || refreshParam;
      
      // Сначала пробуем получить из localStorage, если не требуется обновление
      if (!shouldRefresh) {
        try {
          const localData = localStorage.getItem('twitch_user');
          if (localData) {
            const parsedData = JSON.parse(localData);
            if (parsedData && parsedData.id) {
              console.log('Данные получены из localStorage:', parsedData.id);
              return parsedData;
            }
          }
        } catch (e) {
          console.error('Ошибка при чтении из localStorage:', e);
        }
      } else {
        console.log('Запрошено принудительное обновление данных, пропускаем кэш');
      }
      
      // Если из localStorage не удалось или требуется обновление, делаем запрос к API
      try {
        const response = await fetch('/api/twitch/user', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store',
            'Pragma': 'no-cache'
          },
          credentials: 'include',
        });
        
        if (response.ok) {
          const userData = await response.json();
          if (userData && userData.id) {
            console.log('Данные пользователя получены успешно:', userData.id);
            try {
              localStorage.setItem('twitch_user', JSON.stringify(userData));
              localStorage.setItem('is_authenticated', 'true');
            } catch (e) {
              console.error('Ошибка при сохранении в localStorage:', e);
            }
            return userData;
          }
        } else {
          console.error('Ошибка при запросе к API:', response.status);
        }
      } catch (apiError) {
        console.error('Ошибка при запросе к API:', apiError);
      }
      
      // Если всё ещё нет данных, пробуем из cookie
      try {
        const cookieData = Cookies.get('twitch_user');
        if (cookieData) {
          const parsedCookie = typeof cookieData === 'string' 
            ? JSON.parse(cookieData) 
            : cookieData;
          
          if (parsedCookie && parsedCookie.id) {
            console.log('Данные получены из cookie:', parsedCookie.id);
            return parsedCookie;
          }
        }
      } catch (e) {
        console.error('Ошибка при чтении из cookie:', e);
      }
      
      return null;
    } catch (error) {
      console.error('Глобальная ошибка в fetchUserData:', error);
      return null;
    }
  };

  // Функции загрузки данных с обработкой сетевых ошибок
  const loadFollowers = async (userId) => {
    try {
      console.log('Загрузка фолловеров для ID:', userId);
      // Защитная проверка
      if (!userId) {
        console.error('ID пользователя не определен для загрузки фолловеров');
        return;
      }
      
      // Добавляем параметр для предотвращения кэширования
      const response = await fetch(`/api/twitch/user-followers?userId=${userId}&_=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include',
      }).catch(error => {
        console.error('Ошибка сети при загрузке фолловеров:', error);
        return null;
      });
      
      if (response && response.ok) {
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
        console.error('Ошибка при получении подписчиков:', response?.status || 'Нет ответа');
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
      if (!userId) return;
      console.log('Использую запасной метод загрузки фолловеров');
      const data = await getUserFollowers(userId).catch(() => ({ followers: [], total: 0 }));
      if (data && data.followers) {
        setFollowers(data.followers);
        setTotalFollowers(data.total || data.followers.length);
        console.log('Фолловеры загружены запасным методом:', data.followers.length);
      }
    } catch (fallbackError) {
      console.error('Запасной метод загрузки фолловеров тоже не сработал:', fallbackError);
      // Устанавливаем пустые данные, чтобы не блокировать загрузку других компонентов
      setFollowers([]);
      setTotalFollowers(0);
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

  // Добавляем функцию для загрузки отзывов
  const loadReviews = async (userId) => {
    try {
      console.log('Загрузка отзывов для пользователя:', userId);
      
      // Добавляем параметр для предотвращения кэширования
      const response = await fetch(`/api/reviews?authorId=${userId}&_=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Отзывы успешно загружены:', data);
        return data;
      } else {
        console.error('Ошибка при загрузке отзывов:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Ошибка при загрузке отзывов:', error);
      return null;
    }
  };

  // Добавим функцию для загрузки дополнительных данных
  const loadAdditionalData = async (userId) => {
    try {
      if (!userId) return;
      
      // Загружаем социальные ссылки пользователя
      const savedLinks = localStorage.getItem(`social_links_${userId}`);
      if (savedLinks) {
        try {
          setSocialLinks(JSON.parse(savedLinks));
        } catch (e) {
          console.error('Ошибка при парсинге социальных ссылок:', e);
        }
      }
      
      // Загружаем данные постепенно, не блокируя рендеринг
      loadSocialLinks(userId).catch(e => console.error('Ошибка загрузки соц. ссылок:', e));
      loadStats(userId).catch(e => console.error('Ошибка загрузки статистики:', e));
      
      // Также загружаем отзывы
      loadReviews(userId).catch(e => console.error('Ошибка загрузки отзывов:', e));
      
      // Проверяем день рождения, если есть в профиле
      const userBirthday = localStorage.getItem(`birthday_${userId}`);
      if (userBirthday) {
        const birthdayResult = checkBirthday(userBirthday);
        setIsBirthday(birthdayResult.isBirthday);
        const daysTo = getDaysToBirthday(userBirthday);
        setDaysToBirthday(daysTo);
      }
    } catch (error) {
      console.error('Ошибка при загрузке дополнительных данных:', error);
    }
  };

  // Модифицируем useEffect для загрузки дополнительных данных после базовой загрузки
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        setLoading(true);
        // Проверяем параметры URL для возможного принудительного обновления
        const urlParams = new URLSearchParams(window.location.search);
        const refreshParam = urlParams.get('refresh');
        
        // При наличии параметра refresh, очищаем кэш
        if (refreshParam) {
          console.log('Обнаружен параметр refresh, выполняем принудительное обновление данных');
        }
        
        // Получаем данные пользователя
        const userData = await fetchUserData(refreshParam ? true : false);
        
        if (!userData || !userData.id) {
          console.log('Профиль: Данные пользователя не найдены или нет ID, перенаправление на страницу входа');
          router.push('/login');
          return;
        }
        
        console.log('Данные профиля загружены:', userData.id);
        if (isMounted) {
          setProfileData(userData);
          setUserId(userData.id);
          setUserLogin(userData.login);
          
          // Загружаем базовые данные
          await loadFollowers(userData.id).catch(() => {});
          
          // Загружаем отзывы при инициализации
          await loadReviews(userData.id).catch(() => {});
          
          // После загрузки профиля и базовых данных, загружаем дополнительные
          loadAdditionalData(userData.id);
        }
      } catch (error) {
        console.error('Глобальная ошибка при загрузке данных:', error);
        if (isMounted) {
          setError('Произошла ошибка при загрузке профиля');
          setLoading(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [router]);

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
      if (isAuth && userId) {
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
          <h2>Не удалось загрузить профиль</h2>
          <button onClick={retryLoading} className={styles.button}>
            Попробовать снова
          </button>
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
      }
      
      // 2. Очищаем все переменные в localStorage
      localStorage.removeItem('twitch_user');
      localStorage.removeItem('twitch_token');
      localStorage.removeItem('is_authenticated');
      
      // 3. Устанавливаем признак выхода в localStorage
      localStorage.setItem('logged_out', 'true');
      
      // 4. Перенаправляем на страницу авторизации с параметром, указывающим на выход
      window.location.href = '/auth?logged_out=true';
    } catch (error) {
      console.error('Ошибка при выходе из аккаунта:', error);
      
      // В случае ошибки всё равно пытаемся перенаправить на страницу авторизации
      alert('Произошла ошибка при выходе из аккаунта. Вы будете перенаправлены на страницу авторизации.');
      window.location.href = '/auth';
    }
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

  // Функция для отображения день рождения
  const renderBirthday = () => {
    if (!profileData?.birthday) return null;
    
    if (isBirthday) {
      return (
        <div className={styles.birthdayContainer}>
          <span className={styles.birthdayIcon}>🎂</span>
          <span className={styles.birthdayText}>С днем рождения! +100 стример-коинов!</span>
        </div>
      );
    }
    
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

  // Функция для отображения социальных ссылок
  const renderSocialLinks = () => {
    // Проверяем, существуют ли социальные ссылки
    if (!socialLinks) {
      return (
        <div className={styles.emptySocialLinks}>
          Нет социальных ссылок для отображения.
          {userId === profileData?.id && (
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
          {userId === profileData?.id && (
            <p>Добавьте их в разделе "Редактировать профиль".</p>
          )}
        </div>
      );
    }
    
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
  };
  
  // Функция для переключения отображения отзывов
  const toggleReviews = () => {
    setShowReviews(!showReviews);
    setShowAchievements(false);
    setShowStats(false);
    
    // Если включаем отображение отзывов, обновляем их
    if (!showReviews && profileData && profileData.id) {
      // Загружаем отзывы пользователя
      loadReviews(profileData.id).catch(e => console.error('Ошибка загрузки отзывов:', e));
    }
  };
  
  // Функция для переключения отображения статистики
  const toggleStats = () => {
    setShowStats(!showStats);
    setShowAchievements(false);
    setShowReviews(false);
  };

  // Отображение информации о профиле
  return (
    <div className={styles.container}>
      <div className={styles.profileContainer}>
        <div className={styles.profileHeader}>
          <div className={styles.avatarContainer}>
            {profileData && (
              <CyberAvatar 
                src={profileData.profile_image_url || profileData.profileImageUrl || '/images/default-avatar.png'} 
                alt={profileData.display_name || profileData.login || 'Пользователь'} 
                size={150}
                className={styles.profileAvatar}
              />
            )}
          </div>
          <div className={styles.profileDetails}>
            <h1 className={styles.displayName}>{profileData?.display_name || profileData?.login}</h1>
            <div className={styles.profileStats}>
              <div className={styles.profileStat}>
                <span className={styles.statIcon}>👥</span>
                <span className={styles.statValue}>{totalFollowers.toLocaleString('ru-RU')}</span>
                <span className={styles.statLabel}>Подписчиков</span>
              </div>
              {profileData?.view_count > 0 && (
                <div className={styles.profileStat}>
                  <span className={styles.statIcon}>👁️</span>
                  <span className={styles.statValue}>{profileData.view_count.toLocaleString('ru-RU')}</span>
                  <span className={styles.statLabel}>Просмотров</span>
                </div>
              )}
              {profileData?.broadcaster_type && (
                <div className={styles.profileStat}>
                  <span className={styles.statIcon}>📺</span>
                  <span className={styles.statValue}>
                    {profileData.broadcaster_type === 'affiliate' ? 'Компаньон' : 
                     profileData.broadcaster_type === 'partner' ? 'Партнер' : 'Стандартный'}
                  </span>
                  <span className={styles.statLabel}>Тип канала</span>
                </div>
              )}
            </div>
            {profileData.birthday && renderBirthday()}
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
              className={styles.statsButton} 
              onClick={toggleStats}
              title="Статистика канала"
            >
              📊 Статистика
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
        
        {/* Отображаем разные секции в зависимости от выбранной вкладки */}
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
              <h2>Ваши отзывы</h2>
            </div>
            <ReviewSection 
              userId={profileData.id} 
              isAuthor={true}
              onReviewAdded={() => {
                // После добавления отзыва обновляем данные
                loadAdditionalData(profileData.id);
              }}
            />
          </div>
        ) : showStats ? (
          <div className={styles.statsContainer}>
            <div className={styles.sectionHeader}>
              <h2>Статистика канала</h2>
            </div>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <div className={styles.statIcon}>👁️</div>
                <div className={styles.statInfo}>
                  <div className={styles.statValue}>{profileData.view_count?.toLocaleString('ru-RU') || 0}</div>
                  <div className={styles.statLabel}>Просмотров</div>
                </div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statIcon}>👥</div>
                <div className={styles.statInfo}>
                  <div className={styles.statValue}>{totalFollowers.toLocaleString('ru-RU')}</div>
                  <div className={styles.statLabel}>Подписчиков</div>
                </div>
              </div>
              {profileData.created_at && (
                <div className={styles.statItem}>
                  <div className={styles.statIcon}>📅</div>
                  <div className={styles.statInfo}>
                    <div className={styles.statValue}>{formatDate(profileData.created_at)}</div>
                    <div className={styles.statLabel}>Дата создания</div>
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
        ) : (
          <>
            {/* Отображаем описание и социальные сети по умолчанию */}
            <div className={styles.profileInfoSection}>
              {/* Отображаем описание профиля */}
              {(socialLinks && socialLinks.description) || profileData.description ? (
                <div className={styles.profileDescription}>
                  <h3 className={styles.sectionTitle}>Описание</h3>
                  <p>{socialLinks?.description || profileData.description}</p>
                </div>
              ) : (
                userId === profileData?.id && (
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
    </div>
  );
} 