'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './profile.module.css';
import SocialButton from '../components/SocialButton';
import AchievementsSystem from '../components/AchievementsSystem';
import ReviewSection from '../components/ReviewSection';
import { checkBirthday, getDaysToBirthday } from '../utils/birthdayCheck';
import { getAccessTokenFromCookie } from '../utils/twitchAPI';

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
  const [statsVisibility, setStatsVisibility] = useState({
    followers: true,
    followings: true,
    streams: true,
    channel: true,
    accountInfo: true
  });

  // Функция для загрузки данных пользователя
  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Получаем данные пользователя из localStorage
      const userData = JSON.parse(localStorage.getItem('twitch_user') || '{}');
      
      if (!userData || !userData.id) {
        router.push('/auth');
        return;
      }
      
      // Определяем статус стримера на основе количества фолловеров
      const isStreamer = userData.broadcaster_type === 'partner' || 
                       userData.broadcaster_type === 'affiliate' || 
                       (userData.follower_count && userData.follower_count >= 265);
      
      userData.isStreamer = isStreamer;
      localStorage.setItem('twitch_user', JSON.stringify(userData));
      
      // Получаем расширенную статистику пользователя
      try {
        const response = await fetch('/api/twitch/user-stats');
        if (response.ok) {
          const stats = await response.json();
          setUserStats(stats);
          
          // Обновляем данные пользователя с расширенной статистикой
          userData.follower_count = stats.followers.total;
          userData.following_count = stats.followings.total;
          userData.recent_followers = stats.followers.recentFollowers || [];
          userData.is_live = stats.stream.isLive;
          userData.last_stream = stats.stream.lastStream;
          userData.created_at = stats.user.createdAt;
          userData.view_count = stats.user.viewCount;
          userData.broadcaster_type = stats.user.broadcasterType;
          
          // Повторно определяем статус стримера с обновленными данными
          userData.isStreamer = userData.broadcaster_type === 'partner' || 
                             userData.broadcaster_type === 'affiliate' || 
                             (userData.follower_count && userData.follower_count >= 265);
          
          // Сохраняем обновленные данные в localStorage
          localStorage.setItem('twitch_user', JSON.stringify(userData));
          
          console.log('Получена расширенная статистика пользователя:', stats);
          
          // Загружаем настройки видимости статистики
          try {
            const savedVisibility = localStorage.getItem(`stats_visibility_${userData.id}`);
            if (savedVisibility) {
              setStatsVisibility(JSON.parse(savedVisibility));
            }
          } catch (visibilityError) {
            console.error('Ошибка при загрузке настроек видимости:', visibilityError);
          }
        }
      } catch (statsError) {
        console.error('Ошибка при получении расширенной статистики:', statsError);
      }
      
      setProfileData(userData);
      await loadSocialLinks(userData.id);
      
      // Загружаем день рождения пользователя из localStorage, если он есть
      try {
        const userBirthday = localStorage.getItem(`birthday_${userData.id}`);
        if (userBirthday) {
          setProfileData(prev => ({ ...prev, birthday: userBirthday }));
          
          // Проверяем, является ли сегодня днем рождения пользователя
          const isTodayBirthday = checkBirthday(userData.id);
          setIsBirthday(isTodayBirthday);
          
          // Получаем количество дней до дня рождения
          const days = getDaysToBirthday(userData.id);
          setDaysToBirthday(days);
        }
      } catch (birthdayError) {
        console.error('Ошибка при загрузке дня рождения:', birthdayError);
      }
      
      // Загружаем данные о стримах
      try {
        const completedStreams = localStorage.getItem(`completed_streams_${userData.id}`);
        if (completedStreams) {
          setStreamsCompleted(parseInt(completedStreams, 10) || 0);
        }
        
        const collaborationsStatus = localStorage.getItem(`has_collaborations_${userData.id}`);
        if (collaborationsStatus === 'true') {
          setHasCollaborations(true);
        }
      } catch (streamsError) {
        console.error('Ошибка при загрузке данных о стримах:', streamsError);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Ошибка при загрузке данных профиля:', error);
      setError('Не удалось загрузить данные профиля. Пожалуйста, попробуйте позже.');
      setLoading(false);
    }
  };

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    loadUserData();
  }, []);

  // Функция для загрузки социальных ссылок
  const loadSocialLinks = async (userId) => {
    try {
      // Здесь должен быть запрос к API для получения социальных ссылок
      // Пока используем данные из localStorage
      const savedLinks = localStorage.getItem(`social_links_${userId}`);
      
      if (savedLinks) {
        setSocialLinks(JSON.parse(savedLinks));
      }
    } catch (error) {
      console.error('Ошибка при загрузке социальных ссылок:', error);
    }
  };

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
            type="yandexMusic" 
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

  // Функция для отображения статуса пользователя
  const renderUserStatus = () => {
    // Определяем статус стримера на основе данных профиля
    const isStreamer = profileData?.isStreamer || 
                      profileData?.broadcaster_type === 'partner' || 
                      profileData?.broadcaster_type === 'affiliate' || 
                      (profileData?.follower_count && profileData.follower_count >= 265);
    
    return (
      <div className={styles.statusContainer}>
        <span className={styles.statusText}>Статус:</span>
        <span className={styles.statusValue} style={{ color: isStreamer ? '#9146FF' : '#4CAF50' }}>
          {isStreamer ? 'Стример' : 'Зритель'}
        </span>
        <span className={styles.followersCount}>
          (Фолловеров: {profileData?.follower_count || 0})
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
          
          {userStats.channel.hasSubscriptionProgram && (
            <div className={styles.statItem}>
              <div className={styles.statIcon}>💎</div>
              <div className={styles.statInfo}>
                <div className={styles.statValue}>{userStats.channel.subscribers.toLocaleString('ru-RU')}</div>
                <div className={styles.statLabel}>Платных подписчиков</div>
              </div>
            </div>
          )}
          
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
    if (!userStats || !userStats.followers.recentFollowers || userStats.followers.recentFollowers.length === 0) {
      return (
        <div className={styles.emptyState}>
          <p>У вас пока нет подписчиков</p>
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
    if (!userStats || !userStats.followings.recentFollowings || userStats.followings.recentFollowings.length === 0) {
      return (
        <div className={styles.emptyState}>
          <p>Вы пока ни на кого не подписаны</p>
        </div>
      );
    }
    
    return (
      <div className={styles.usersList}>
        {userStats.followings.recentFollowings.map(following => (
          <div key={following.id} className={styles.userCard}>
            <img 
              src={following.profileImageUrl || '/default-avatar.png'} 
              alt={following.name} 
              className={styles.userAvatar}
            />
            <div className={styles.userInfo}>
              <div className={styles.userName}>{following.name}</div>
              <div className={styles.userDate}>Подписка с: {formatDate(following.followedAt)}</div>
            </div>
          </div>
        ))}
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
  
  // Функция для склонения слов
  const getDeclension = (number, words) => {
    const cases = [2, 0, 1, 1, 1, 2];
    return words[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]];
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
      <div className={styles.error}>
        <p>{error}</p>
        <button className={styles.button} onClick={() => router.push('/login')}>
          Вернуться на страницу входа
        </button>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className={styles.error}>
        <p>Не удалось загрузить данные профиля. Пожалуйста, войдите в аккаунт.</p>
        <button className={styles.button} onClick={() => router.push('/login')}>
          Войти
        </button>
      </div>
    );
  }

  return (
    <div className={styles.profileContainer}>
      <div className={styles.profileHeader}>
        <img 
          src={profileData.profile_image_url || '/default-avatar.png'} 
          alt={profileData.display_name} 
          className={styles.avatar}
        />
        <div className={styles.profileInfo}>
          <h1>{profileData.display_name}</h1>
          {renderUserStatus()}
          {renderBirthday()}
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
          <a 
            href="/auth?logged_out=true" 
            className={styles.logoutButton} 
            style={{ marginLeft: '10px', textDecoration: 'none', textAlign: 'center' }}
            onClick={(e) => {
              e.preventDefault();
              localStorage.removeItem('twitch_user');
              localStorage.removeItem('twitch_token');
              localStorage.removeItem('is_authenticated');
              localStorage.setItem('logged_out', 'true');
              window.location.href = '/auth?logged_out=true';
            }}
          >
            Альтернативный выход
          </a>
        </div>
      </div>
      
      {showAchievements ? (
        <div className={styles.achievementsSection}>
          <div className={styles.sectionHeader}>
            <h2>Достижения</h2>
            <button 
              className={styles.backToProfileButton}
              onClick={() => setShowAchievements(false)}
            >
              Вернуться к профилю
            </button>
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
            <button 
              className={styles.backToProfileButton}
              onClick={() => setShowReviews(false)}
            >
              Вернуться к профилю
            </button>
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
              
              <button 
                className={styles.backToProfileButton}
                onClick={() => setShowStats(false)}
              >
                Вернуться к профилю
              </button>
            </div>
          </div>
          
          {renderChannelStats()}
          {renderAccountInfo()}
        </div>
      ) : showFollowers ? (
        <div className={styles.followersContainer}>
          <div className={styles.sectionHeader}>
            <h2>Ваши подписчики ({userStats?.followers.total || 0})</h2>
            <button 
              className={styles.backToProfileButton}
              onClick={() => setShowFollowers(false)}
            >
              Вернуться к статистике
            </button>
          </div>
          {renderRecentFollowers()}
        </div>
      ) : showFollowings ? (
        <div className={styles.followingsContainer}>
          <div className={styles.sectionHeader}>
            <h2>Ваши подписки ({userStats?.followings.total || 0})</h2>
            <button 
              className={styles.backToProfileButton}
              onClick={() => setShowFollowings(false)}
            >
              Вернуться к статистике
            </button>
          </div>
          {renderRecentFollowings()}
        </div>
      ) : showStreams ? (
        <div className={styles.streamsContainer}>
          <div className={styles.sectionHeader}>
            <h2>Ваши стримы</h2>
            <button 
              className={styles.backToProfileButton}
              onClick={() => setShowStreams(false)}
            >
              Вернуться к статистике
            </button>
          </div>
          {renderRecentStreams()}
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