'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './profile.module.css';
import SocialButton from '../components/SocialButton';
import AchievementsSystem from '../components/AchievementsSystem';
import ReviewSection from '../components/ReviewSection';
import { checkBirthday, getDaysToBirthday } from '../utils/birthdayCheck';
import { getUserData, getUserStats, fetchWithTokenRefresh } from '../utils/twitchAPI';
import { DataStorage } from '../utils/dataStorage';
import Cookies from 'js-cookie';
import CyberAvatar from '../components/CyberAvatar';

// Вспомогательная функция для склонения слова "день"
const getDaysText = (days) => {
  if (days === null) return '';
  const lastDigit = days % 10;
  const lastTwoDigits = days % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'дней';
  }
  if (lastDigit === 1) {
    return 'день';
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'дня';
  }
  return 'дней';
};

export default function Profile() {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [specificErrors, setSpecificErrors] = useState({});
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [userLogin, setUserLogin] = useState('');
  const [socialLinks, setSocialLinks] = useState({
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
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowings, setLoadingFollowings] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingSocialLinks, setLoadingSocialLinks] = useState(false);
  const [loadingBirthday, setLoadingBirthday] = useState(false);
  const [statsVisibility, setStatsVisibility] = useState({
    followers: true,
    followings: true,
    streams: true,
    channel: true,
    accountInfo: true
  });
  const [totalFollowers, setTotalFollowers] = useState(0);
  const [totalFollowings, setTotalFollowings] = useState(0);

  const fetchUserData = async (forceRefresh = false) => {
    console.log('Начало загрузки данных пользователя...');
    const urlParams = new URLSearchParams(window.location.search);
    const refreshParam = urlParams.get('refresh');
    const shouldRefresh = forceRefresh || refreshParam;

    if (!shouldRefresh) {
      try {
        const cachedUserData = await DataStorage.getData('user');
        if (cachedUserData && cachedUserData.id) {
          console.log('Данные пользователя получены из DataStorage:', cachedUserData.id);
          return cachedUserData;
        }
      } catch (e) {
        console.error('Ошибка при получении данных из DataStorage:', e);
      }
    } else {
      console.log('Запрошено принудительное обновление данных, пропускаем кэш DataStorage');
    }

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
        const apiUserData = await response.json();
        if (apiUserData && apiUserData.id) {
          console.log('Данные пользователя получены с API:', apiUserData.id);
          await DataStorage.saveData('user', apiUserData);
          return apiUserData;
        }
      } else {
         console.error('Ошибка при запросе пользователя к API:', response.status);
         const cookieData = Cookies.get('twitch_user');
         if (cookieData) {
            try {
                const parsedCookie = JSON.parse(cookieData);
                if (parsedCookie && parsedCookie.id) {
                    console.log('Данные получены из cookie (резерв):', parsedCookie.id);
                    await DataStorage.saveData('user', parsedCookie);
                    return parsedCookie;
                }
            } catch (e) { console.error('Ошибка парсинга cookie:', e); }
         }
        throw new Error(`API Error: ${response.status}`);
      }
    } catch (apiError) {
      console.error('Ошибка при запросе к API или обработке:', apiError);
       const cookieData = Cookies.get('twitch_user');
       if (cookieData) {
          try {
              const parsedCookie = JSON.parse(cookieData);
              if (parsedCookie && parsedCookie.id) {
                  console.log('Данные получены из cookie (резерв):', parsedCookie.id);
                  await DataStorage.saveData('user', parsedCookie);
                  return parsedCookie;
              }
          } catch (e) { console.error('Ошибка парсинга cookie:', e); }
       }
      setError('Не удалось загрузить основные данные профиля.');
      return null;
    }
    return null;
  };

  const loadFollowers = async (userId) => {
    setSpecificErrors(prev => ({ ...prev, followers: null }));
    setLoadingFollowers(true);
    try {
      console.log('Загрузка фолловеров для ID:', userId);
      if (!userId) {
        console.error('ID пользователя не определен для загрузки фолловеров');
        throw new Error('ID пользователя не определен');
      }
      const response = await fetch(`/api/twitch/user-followers?userId=${userId}&_=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.followers) {
          setFollowers(data.followers || []);
          setTotalFollowers(data.total || data.followers.length || 0);
          console.log('Подписчики успешно загружены:', data.followers?.length || 0, 'Всего:', data.total || 0);
        } else {
          console.warn('Данные фолловеров некорректные или отсутствуют:', data);
          setFollowers([]);
          setTotalFollowers(0);
           throw new Error('Некорректные данные подписчиков');
        }
      } else {
        console.error('Ошибка при получении подписчиков:', response.status);
        throw new Error(`API Error Followers: ${response.status}`);
      }
    } catch (error) {
      console.error('Ошибка при загрузке подписчиков:', error);
      setSpecificErrors(prev => ({ ...prev, followers: 'Не удалось загрузить подписчиков' }));
      setFollowers([]);
      setTotalFollowers(0);
    } finally {
      setLoadingFollowers(false);
    }
  };

  const loadFollowings = async (userId) => {
    setSpecificErrors(prev => ({ ...prev, followings: null }));
    setLoadingFollowings(true);
    try {
      console.log('Загрузка подписок для ID:', userId);
       if (!userId) {
        console.error('ID пользователя не определен для загрузки подписок');
        throw new Error('ID пользователя не определен');
      }
      const response = await fetch(`/api/twitch/user-followings?userId=${userId}&_=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include',
        mode: 'cors',
        next: { revalidate: 0 }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.followings) {
          setFollowings(data.followings || []);
          setTotalFollowings(data.total || data.followings.length || 0);
          console.log('Подписки успешно загружены:', data.followings?.length || 0, 'Всего:', data.total || 0);
        } else {
           console.warn('Данные подписок некорректные или отсутствуют:', data);
          setFollowings([]);
          setTotalFollowings(0);
          throw new Error('Некорректные данные подписок');
        }
      } else {
        console.error('Ошибка при получении подписок:', response.status);
        throw new Error(`API Error Followings: ${response.status}`);
      }
    } catch (error) {
      console.error('Ошибка при загрузке подписок:', error);
      setSpecificErrors(prev => ({ ...prev, followings: 'Не удалось загрузить подписки' }));
      setFollowings([]);
      setTotalFollowings(0);
    } finally {
      setLoadingFollowings(false);
    }
  };

  const loadStats = async (userId) => {
     setSpecificErrors(prev => ({ ...prev, stats: null }));
     setLoadingStats(true);
    try {
      console.log('Загрузка статистики пользователя для:', userId);
       if (!userId) throw new Error('ID пользователя не определен');
      const response = await fetch(`/api/twitch/user-stats?userId=${userId}&_=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include',
        mode: 'cors',
        next: { revalidate: 0 }
      });

      if (response.ok) {
        const stats = await response.json();
        console.log('Статистика пользователя успешно загружена:', stats);
        if (stats && Object.keys(stats).length > 0) {
            setUserStats(stats);
            if (stats.stream && typeof stats.stream.completedStreams === 'number') {
                setStreamsCompleted(stats.stream.completedStreams);
            }
        } else {
             console.warn('Данные статистики получены, но пусты или некорректны:', stats);
             setUserStats(null);
        }
      } else {
        console.error('Ошибка при загрузке статистики пользователя:', response.status);
        setUserStats(null);
        throw new Error(`API Error Stats: ${response.status}`);
      }
    } catch (error) {
      console.error('Ошибка при получении статистики пользователя:', error);
      setSpecificErrors(prev => ({ ...prev, stats: 'Не удалось загрузить статистику' }));
      setUserStats(null);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadSocialLinks = async (userId) => {
    setSpecificErrors(prev => ({ ...prev, socialLinks: null }));
    setLoadingSocialLinks(true);
    try {
      console.log('Загрузка социальных ссылок для ID:', userId);
      if (!userId) throw new Error('ID пользователя не определен');

      const response = await fetch(`/api/user/${userId}/social-links?_=${Date.now()}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
          credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Социальные ссылки успешно загружены:', data);
        if (data && typeof data === 'object' && Object.values(data).some(val => typeof val === 'string' && val.trim() !== '')) {
           setSocialLinks(data);
        } else {
           console.warn('Социальные ссылки получены, но пусты или некорректны:', data);
           setSocialLinks(null);
        }
      } else {
        console.error('Ошибка при загрузке соц. ссылок:', response.status);
         setSocialLinks(null);
        throw new Error(`API Error Social Links: ${response.status}`);
      }
    } catch (error) {
      console.error('Ошибка при получении социальных ссылок:', error);
      setSpecificErrors(prev => ({ ...prev, socialLinks: 'Не удалось загрузить соц. ссылки' }));
      setSocialLinks(null);
    } finally {
      setLoadingSocialLinks(false);
    }
  };

  const loadBirthdayData = async (userId) => {
    setSpecificErrors(prev => ({ ...prev, birthday: null }));
    setLoadingBirthday(true);
    try {
      console.log('Загрузка данных о дне рождения для ID:', userId);
       if (!userId) throw new Error('ID пользователя не определен');
      const response = await fetch(`/api/user/${userId}/birthday?_=${Date.now()}`, {
           method: 'GET',
           headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
           credentials: 'include',
       });

      if (response.ok) {
        const data = await response.json();
        console.log('Данные о дне рождения успешно загружены:', data);
        if (data && data.birthday) {
          const birthDate = new Date(data.birthday);
          if (!isNaN(birthDate.getTime())) {
              const { isToday, daysLeft } = checkBirthday(birthDate);
              setIsBirthday(isToday);
              setDaysToBirthday(daysLeft);
              setProfileData(prev => ({ ...prev, birthday: data.birthday }));
          } else {
              console.warn('Получена некорректная дата рождения:', data.birthday);
              setIsBirthday(false);
              setDaysToBirthday(null);
              setProfileData(prev => ({ ...prev, birthday: null }));
          }
        } else {
          setIsBirthday(false);
          setDaysToBirthday(null);
          setProfileData(prev => ({ ...prev, birthday: null }));
        }
      } else {
        console.error('Ошибка при загрузке данных о дне рождения:', response.status);
        setIsBirthday(false);
        setDaysToBirthday(null);
        setProfileData(prev => ({ ...prev, birthday: null }));
        throw new Error(`API Error Birthday: ${response.status}`);
      }
    } catch (error) {
      console.error('Ошибка при получении данных о дне рождения:', error);
      setSpecificErrors(prev => ({ ...prev, birthday: 'Не удалось загрузить инфо о дне рождения' }));
      setIsBirthday(false);
      setDaysToBirthday(null);
      setProfileData(prev => ({ ...prev, birthday: null }));
    } finally {
      setLoadingBirthday(false);
    }
  };

  const loadTierlists = async (userId) => {
    try {
      console.log('Загрузка тирлистов для:', userId);
      const response = await fetch(`/api/tierlists?userId=${userId}&_=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include',
        mode: 'cors',
        next: { revalidate: 0 }
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

  const loadReviews = async (userId) => {
    try {
      console.log('Загрузка отзывов для пользователя:', userId);
      
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

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        setSpecificErrors({});

        const urlParams = new URLSearchParams(window.location.search);
        const refreshParam = urlParams.get('refresh');

        const userData = await fetchUserData(!!refreshParam);

        if (!isMounted) return;

        if (!userData || !userData.id) {
          console.log('Профиль: Данные пользователя не найдены, перенаправление на /login');
          router.push('/login');
          return;
        }

        console.log('Основные данные профиля загружены:', userData.id);
        setProfileData(userData);
        setUserId(userData.id);
        setUserLogin(userData.login);

        await Promise.allSettled([
          loadFollowers(userData.id),
          loadFollowings(userData.id),
          loadStats(userData.id),
          loadSocialLinks(userData.id),
          loadBirthdayData(userData.id),
          loadTierlists(userData.id),
          loadReviews(userData.id)
        ]);

        if (!isMounted) return;

        console.log('Все дополнительные данные загружены (или попытка загрузки завершена).');

      } catch (error) {
        console.error('Глобальная ошибка при начальной загрузке данных:', error);
        if (isMounted) {
           if (!profileData) {
               setError(error.message || 'Произошла критическая ошибка при загрузке профиля.');
           }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          if (window.history.replaceState) {
              const cleanUrl = window.location.pathname;
              window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
          }
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '';

    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            console.warn('Невалидная дата для форматирования:', dateString);
            return 'Неверная дата';
        }
        return date.toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
    } catch (e) {
        console.error('Ошибка форматирования даты:', dateString, e);
        return 'Ошибка даты';
    }
  };

  const renderBirthday = () => {
    if (!profileData?.birthday || !profileData?.showBirthday) return null;

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
            День рождения через {daysToBirthday} {getDaysText(daysToBirthday)}!
          </span>
        </div>
      );
    }
    
    return (
      <div className={styles.birthdayContainer}>
        <span className={styles.birthdayIcon}>🎂</span>
        <span className={styles.birthdayText}>Скоро день рождения!</span>
      </div>
    );
  };
  
  const getDayWord = (days) => {
    if (days === 1) return 'день';
    if (days >= 2 && days <= 4) return 'дня';
    return 'дней';
  };

  const renderSocialLinks = () => {
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
  
  const toggleAchievements = () => {
    setShowAchievements(!showAchievements);
    setShowReviews(false);
    setShowStats(false);
  };
  
  const toggleReviews = () => {
    setShowReviews(!showReviews);
    setShowAchievements(false);
    setShowStats(false);
    
    if (!showReviews && profileData && profileData.id) {
      loadReviews(profileData.id).catch(e => console.error('Ошибка загрузки отзывов:', e));
    }
  };
  
  const toggleStats = () => {
    setShowStats(!showStats);
    setShowAchievements(false);
    setShowReviews(false);
  };

  if (loading) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.profileHeader}>
          <h1>Загрузка профиля...</h1>
        </div>
      </div>
    );
  }

  const retryLoading = (section) => {
    console.log(`Повторная попытка загрузки секции: ${section}`);
    if (!userId) {
      console.error('Невозможно повторить загрузку: userId отсутствует');
      return;
    }
    switch (section) {
      case 'followers':
        loadFollowers(userId);
        break;
      case 'followings':
        loadFollowings(userId);
        break;
      case 'stats':
        loadStats(userId);
        break;
      case 'socialLinks':
        loadSocialLinks(userId);
        break;
      case 'birthday':
        loadBirthdayData(userId);
        break;
      case 'tierlists':
        loadTierlists(userId);
        break;
      default:
        console.warn(`Неизвестная секция для повторной загрузки: ${section}`);
    }
  };

  if (error) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.error}>
          <h2>Произошла ошибка</h2>
          <p>{error}</p>
          <button onClick={() => retryLoading('followers')} className={styles.button}>
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (!profileData && !loading) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.profileHeader}>
          <h2>Не удалось загрузить профиль</h2>
          <button onClick={() => retryLoading('followers')} className={styles.button}>
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    try {
      console.log('Выполняем выход из аккаунта (клиентская версия)...');
      
      if (typeof document !== 'undefined') {
        document.cookie = 'twitch_access_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        document.cookie = 'twitch_refresh_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        document.cookie = 'twitch_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        document.cookie = 'twitch_user=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        document.cookie = 'twitch_auth_state=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      }
      
      localStorage.removeItem('twitch_user');
      localStorage.removeItem('twitch_token');
      localStorage.removeItem('is_authenticated');
      
      localStorage.setItem('logged_out', 'true');
      
      window.location.href = '/auth?logged_out=true';
    } catch (error) {
      console.error('Ошибка при выходе из аккаунта:', error);
      
      alert('Произошла ошибка при выходе из аккаунта. Вы будете перенаправлены на страницу авторизации.');
      window.location.href = '/auth';
    }
  };

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
                <div className={styles.userStats}>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Подписчики</span>
                    {loadingFollowers ? (
                      <div className={styles.smallLoader}></div>
                    ) : specificErrors.followers ? (
                      <div className={styles.statError}>
                        <span className={styles.errorText}>Ошибка</span>
                        <button onClick={() => retryLoading('followers')} className={styles.retryButton} title="Повторить">↺</button>
                      </div>
                    ) : (
                      <span className={styles.statValue}>{totalFollowers ?? '0'}</span>
                    )}
                  </div>
                </div>
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
                loadBirthdayData(profileData.id);
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
            <div className={styles.profileInfoSection}>
              {profileData?.description ? (
                <div className={styles.profileDescription}>
                  <h3 className={styles.sectionTitle}>Описание</h3>
                  <p>{profileData.description}</p>
                </div>
              ) : (
                userId === profileData?.id && (
                  <div className={styles.emptyDescription}>
                    <p>Нет описания профиля.</p>
                    <p>Добавьте его в разделе "Редактировать профиль".</p>
                  </div>
                )
              )}
              
              <div className={styles.socialLinksSection}>
                <h3 className={styles.sectionTitle}>Социальные сети</h3>
                {renderSocialLinks()}
              </div>
            </div>
          </>
        )}
        <div className={styles.loadingErrors}>
          {Object.entries(specificErrors).map(([key, errorMsg]) => {
            if (!errorMsg || ['followers', 'followings', 'stats', 'socialLinks', 'birthday'].includes(key)) return null;
            return (
              <div key={key} className={styles.errorItem}>
                <span className={styles.errorIcon}>⚠️</span> 
                {errorMsg}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 