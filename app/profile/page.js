'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './profile.module.css';
import SocialButton from '../components/SocialButton';
import AchievementsSystem from '../components/AchievementsSystem';
import ReviewSection from '../components/ReviewSection';
import { checkBirthday, getDaysToBirthday } from '../utils/birthdayCheck';
import { getUserData, getUserFollowers, getUserStats } from '../utils/twitchAPI';
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

  // Функция для загрузки данных пользователя
  const loadUserData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Проверяем токен
      const accessToken = Cookies.get('twitch_access_token');
      if (!accessToken) {
        console.error('Отсутствует токен доступа, перенаправление на страницу авторизации');
        router.push('/auth');
        return;
      }
      
      // Сначала пытаемся загрузить данные из локального хранилища
      try {
        const localUser = localStorage.getItem('twitch_user');
        if (localUser) {
          const userData = JSON.parse(localUser);
          if (userData && userData.id) {
            setProfileData(userData);
            // Продолжаем загрузку свежих данных в фоне
            console.log('Загружены данные из localStorage, продолжаем загрузку свежих данных');
            
            // Загружаем социальные ссылки из localStorage
            try {
              const storedSocialLinks = localStorage.getItem('social_links');
              if (storedSocialLinks) {
                const parsedLinks = JSON.parse(storedSocialLinks);
                setSocialLinks(parsedLinks);
                console.log('Загружены социальные ссылки из localStorage');
              }
            } catch (error) {
              console.error('Ошибка при загрузке социальных ссылок:', error);
            }
          }
        }
      } catch (localError) {
        console.warn('Не удалось получить данные из localStorage:', localError);
      }
      
      // Получаем данные пользователя из API
      try {
        // Установим таймаут для запроса, чтобы избежать бесконечной загрузки
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-секундный таймаут
        
        const response = await fetch('/api/twitch/profile', {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Ошибка при получении данных профиля');
        }
        
        const userData = await response.json();
        
        if (!userData || !userData.id) {
          setError('Не удалось получить данные профиля');
          setLoading(false);
          return;
        }
        
        setProfileData(userData);
        
        // Загружаем дополнительные данные в фоне
        setTimeout(() => {
          Promise.all([
            getUserStats(userData.id)
              .then(stats => {
                if (stats) {
                  setUserStats(stats);
                  
                  // Сохраняем статистику в localStorage для быстрого доступа
                  if (typeof window !== 'undefined') {
                    localStorage.setItem(`user_stats_${userData.id}`, JSON.stringify(stats));
                  }
                }
              })
              .catch(statsError => console.error('Ошибка при загрузке статистики пользователя:', statsError)),
            
            // Запускаем загрузку фолловеров в фоне
            fetchFollowings()
          ]).catch(err => console.error('Ошибка при загрузке дополнительных данных:', err));
        }, 300);
        
      } catch (apiError) {
        console.error('Ошибка при получении данных пользователя из API:', apiError);
        
        // Если уже установлены данные из localStorage, просто показываем их
        if (!profileData) {
          setError('Ошибка при загрузке данных профиля');
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
      if (!profileData) {
        setError('Не удалось загрузить данные');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Функция для сохранения настроек видимости статистики
  const saveStatsVisibility = async (newVisibility) => {
    setStatsVisibility(newVisibility);
    await DataStorage.saveData('stats_visibility', newVisibility);
  };
  
  // Функция для сохранения социальных ссылок
  const saveSocialLinks = async (newLinks) => {
    setSocialLinks(newLinks);
    await DataStorage.saveData('social_links', newLinks);
  };

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    try {
      console.log('Профиль: начало инициализации');
      
      // Получаем данные пользователя из localStorage
      let userData = null;
      try {
        const storedUser = localStorage.getItem('twitch_user');
        if (storedUser) {
          userData = JSON.parse(storedUser);
          console.log('Получены данные из localStorage:', userData.login || userData.display_name);
        }
      } catch (error) {
        console.error('Ошибка при получении данных из localStorage:', error);
      }
      
      // Если данные есть в localStorage, устанавливаем их сразу
      if (userData && userData.id) {
        setProfileData(userData);
        setLoading(false);
        console.log('Установлены данные профиля из localStorage');
        
        // Загружаем социальные ссылки из localStorage
        try {
          const storedSocialLinks = localStorage.getItem('social_links');
          if (storedSocialLinks) {
            const parsedLinks = JSON.parse(storedSocialLinks);
            setSocialLinks(parsedLinks);
            console.log('Загружены социальные ссылки из localStorage');
          }
        } catch (error) {
          console.error('Ошибка при загрузке социальных ссылок:', error);
        }
      }
      
      // Получаем токен
      const accessToken = localStorage.getItem('cookie_twitch_access_token') || 
                          localStorage.getItem('twitch_token') || 
                          Cookies.get('twitch_access_token');
      
      if (!accessToken) {
        console.warn('Отсутствует токен доступа для API запросов');
        if (!userData) {
          setError('Не удалось получить данные профиля. Пожалуйста, авторизуйтесь.');
          setLoading(false);
        }
        return;
      }
      
      // Делаем прямой fetch запрос с абсолютным таймаутом
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      fetch('/api/twitch/profile', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Ошибка API: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // Сохраняем данные в localStorage и устанавливаем их в state
        localStorage.setItem('twitch_user', JSON.stringify(data));
        setProfileData(data);
        setLoading(false);
        
        // После успешной загрузки профиля запускаем подгрузку дополнительных данных
        fetchFollowings();
        fetchTierlists();
      })
      .catch(error => {
        console.error('Ошибка при загрузке профиля:', error);
        // Если у нас уже есть данные из localStorage, то не показываем ошибку
        if (!userData) {
          setError('Ошибка при загрузке данных профиля. Пожалуйста, обновите страницу.');
          setLoading(false);
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });
      
    } catch (error) {
      console.error('Критическая ошибка:', error);
      setError('Произошла непредвиденная ошибка. Пожалуйста, обновите страницу.');
      setLoading(false);
    }
  }, []);

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

  // Вместо кнопки "Попробовать снова" с loadUserData используем функцию для перезагрузки страницы
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
            type="yandexmusic" 
            url={socialLinks.yandexMusic} 
            username={socialLinks.yandexMusic.split('/').pop()} 
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
    if (!userStats || !statsVisibility.channel) return null;
    
    // Проверяем наличие реальных данных
    const hasRealData = userStats && 
      userStats.user && 
      typeof userStats.user.viewCount === 'number' &&
      userStats.followers && 
      userStats.followings;
    
    // Если данных нет, показываем сообщение
    if (!hasRealData) {
      return (
        <div className={styles.statsSection}>
          <h3 className={styles.statsTitle}>Статистика канала</h3>
          <div className={styles.emptyState}>
            <p>Статистика пока недоступна. Попробуйте обновить страницу позже.</p>
            <button 
              className={styles.button}
              onClick={loadUserData}
              style={{ marginTop: '15px' }}
            >
              Обновить данные
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className={styles.statsSection}>
        <h3 className={styles.statsTitle}>Статистика канала</h3>
        
        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <div className={styles.statIcon}>👁️</div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{userStats.user.viewCount.toLocaleString('ru-RU')}</div>
              <div className={styles.statLabel}>Просмотров</div>
            </div>
          </div>
          
          <div className={styles.statItem}>
            <div className={styles.statIcon}>👥</div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{userStats.followers.total.toLocaleString('ru-RU')}</div>
              <div className={styles.statLabel}>Подписчиков</div>
            </div>
          </div>
          
          <div className={styles.statItem}>
            <div className={styles.statIcon}>📺</div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{userStats.followings.total.toLocaleString('ru-RU')}</div>
              <div className={styles.statLabel}>Подписок</div>
            </div>
          </div>
          
          {userStats.channel && userStats.channel.hasSubscriptionProgram && (
            <div className={styles.statItem}>
              <div className={styles.statIcon}>💎</div>
              <div className={styles.statInfo}>
                <div className={styles.statValue}>{userStats.channel.subscribers.toLocaleString('ru-RU')}</div>
                <div className={styles.statLabel}>Платных подписчиков</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Функция для отображения информации об аккаунте
  const renderAccountInfo = () => {
    if (!userStats || !statsVisibility.accountInfo) return null;
    
    const createdAt = new Date(userStats.user.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - createdAt);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffYears = Math.floor(diffDays / 365);
    const remainingDays = diffDays % 365;
    
    let accountAge = '';
    if (diffYears > 0) {
      accountAge = `${diffYears} ${getDeclension(diffYears, ['год', 'года', 'лет'])}`;
      if (remainingDays > 0) {
        accountAge += ` и ${remainingDays} ${getDeclension(remainingDays, ['день', 'дня', 'дней'])}`;
      }
    } else {
      accountAge = `${diffDays} ${getDeclension(diffDays, ['день', 'дня', 'дней'])}`;
    }
    
    return (
      <div className={styles.statsSection}>
        <h3 className={styles.statsTitle}>Информация об аккаунте</h3>
        
        <div className={styles.accountInfoList}>
          <div className={styles.accountInfoItem}>
            <div className={styles.accountInfoLabel}>Дата создания:</div>
            <div className={styles.accountInfoValue}>{formatDate(userStats.user.createdAt)}</div>
          </div>
          
          <div className={styles.accountInfoItem}>
            <div className={styles.accountInfoLabel}>Возраст аккаунта:</div>
            <div className={styles.accountInfoValue}>{accountAge}</div>
          </div>
          
          {userStats.user.broadcasterType && (
            <div className={styles.accountInfoItem}>
              <div className={styles.accountInfoLabel}>Тип вещателя:</div>
              <div className={styles.accountInfoValue}>
                {userStats.user.broadcasterType === 'partner' ? 'Партнер' : 
                 userStats.user.broadcasterType === 'affiliate' ? 'Аффилиат' : 
                 'Стандартный'}
              </div>
            </div>
          )}
          
          {userStats.stream.isLive && (
            <div className={styles.accountInfoItem}>
              <div className={styles.accountInfoLabel}>Статус:</div>
              <div className={styles.accountInfoValue}>
                <span className={styles.liveStatus}>В эфире</span>
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
              onClick={loadUserData}
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
      
      // Вызов нового API для принудительного обновления фолловеров
      const response = await fetch(`/api/twitch/refresh-followers?userId=${profileData.id}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка при обновлении фолловеров: ${response.status}`);
      }
      
      const refreshedData = await response.json();
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

  // Функция для загрузки фолловингов
  const fetchFollowings = async () => {
    if (!profileData || !profileData.id) {
      console.warn('Невозможно загрузить фолловингов: нет данных профиля');
      return;
    }
    
    try {
      console.log('Загрузка фолловингов для пользователя:', profileData.id);
      
      // Получаем токен
      const accessToken = localStorage.getItem('cookie_twitch_access_token') || 
                         localStorage.getItem('twitch_token') || 
                         Cookies.get('twitch_access_token');
      
      if (!accessToken) {
        console.warn('Отсутствует токен доступа для загрузки фолловингов');
        return;
      }
      
      // Делаем прямой fetch запрос с абсолютным таймаутом
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const url = `/api/twitch/user-followings?userId=${profileData.id}`;
      
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Cache-Control': 'no-cache'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Ошибка API: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Получены данные о фолловингах:', data);
        
        // Проверяем структуру данных и устанавливаем их
        if (data && Array.isArray(data)) {
          setFollowings(data);
        } else if (data && Array.isArray(data.followings)) {
          setFollowings(data.followings);
        } else {
          console.warn('Некорректный формат данных о фолловингах:', data);
          setFollowings([]);
        }
      } catch (error) {
        console.error('Ошибка при загрузке фолловингов:', error);
        setFollowings([]);
      }
    } catch (error) {
      console.error('Критическая ошибка при загрузке фолловингов:', error);
      setFollowings([]);
    }
  };

  // Функция для загрузки тирлистов пользователя
  const fetchTierlists = async () => {
    if (!profileData || !profileData.id) return;
    
    try {
      const response = await fetch(`/api/tierlists?userId=${profileData.id}`);
      
      if (!response.ok) {
        console.error('Ошибка при загрузке тирлистов:', await response.text());
        return;
      }
      
      const data = await response.json();
      console.log('Загружены тирлисты:', data);
      setTierlists(data);
    } catch (error) {
      console.error('Ошибка при загрузке тирлистов:', error);
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

  return (
    <div className={styles.profileContainer}>
      <div className={styles.profileHeader}>
        <div className={styles.avatarContainer}>
          <CyberAvatar 
            imageUrl={getUserAvatar()} 
            alt={profileData?.login || profileData?.twitchName || 'Пользователь'}
            size={150}
          />
        </div>
        <div className={styles.profileInfo}>
          <h1>{profileData.display_name || profileData.login}</h1>
          {renderUserStatus()}
          
          {/* Добавляем блок с социальными сетями сразу под статусом */}
          <div className={styles.profileSocialLinks}>
            {renderSocialLinks()}
          </div>
          
          {/* Добавляем кнопки для быстрого перехода к фолловерам и подпискам */}
          <div className={styles.profileQuickLinks}>
            <button 
              className={`${styles.quickLinkButton} ${showFollowers ? styles.activeQuickLink : ''}`} 
              onClick={toggleFollowers}
            >
              👥 Фолловеры
            </button>
            <button 
              className={`${styles.quickLinkButton} ${showFollowings ? styles.activeQuickLink : ''}`} 
              onClick={toggleFollowings}
            >
              👀 Подписки
            </button>
          </div>
          
          {isBirthday && (
            <div className={styles.birthdayContainer}>
              <span className={styles.birthdayIcon}>🎂</span>
              <span className={styles.birthdayText}>С днем рождения! +100 стример-коинов!</span>
            </div>
          )}
          
          {daysToBirthday !== null && (
            <div className={styles.birthdayContainer}>
              <span className={styles.birthdayIcon}>🎂</span>
              <span className={styles.birthdayText}>
                День рождения через {daysToBirthday} {getDayWord(daysToBirthday)}!
              </span>
            </div>
          )}
          
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
          <ReviewSection userId={profileData.id} />
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
          {socialLinks.description && (
            <div className={styles.description}>
              <p>{socialLinks.description}</p>
            </div>
          )}
          
          {renderSocialLinks()}
        </>
      )}
    </div>
  );
} 