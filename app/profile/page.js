'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './profile.module.css';
import SocialButton from '../components/SocialButton';
import AchievementsSystem from '../components/AchievementsSystem';
import ReviewSection from '../components/ReviewSection';
import { checkBirthday } from '../utils/birthdayCheck';
import { DataStorage } from '../utils/dataStorage';
import Cookies from 'js-cookie';
import CyberAvatar from '../components/CyberAvatar';

// Вспомогательная функция для склонения слова "день"
const getDaysText = (days) => {
  if (days === null || days === undefined) return '';
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
  const router = useRouter();
  const searchParams = useSearchParams();

  const [twitchUserData, setTwitchUserData] = useState(null);
  const [userProfileDbData, setUserProfileDbData] = useState(null);

  const [loadingTwitchUser, setLoadingTwitchUser] = useState(true);
  const [loadingProfileDb, setLoadingProfileDb] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const [globalError, setGlobalError] = useState(null);
  const [specificErrors, setSpecificErrors] = useState({});
  const [loadingState] = useState({ followers: false });
  const [errorMessages] = useState({ followers: null });
  const [totalFollowers] = useState(0);

  const [showAchievements, setShowAchievements] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [showStats, setShowStats] = useState(false);
  
  const [userId, setUserId] = useState('');

  const fetchTwitchUserData = useCallback(async (forceRefresh = false) => {
    setLoadingTwitchUser(true);
    setGlobalError(null);
    console.log('Profile: Начало загрузки данных Twitch пользователя...');
    const shouldRefresh = forceRefresh || searchParams.get('refresh') === 'true';

    if (!shouldRefresh) {
      try {
        const cachedUserData = await DataStorage.getData('user');
        if (cachedUserData && cachedUserData.id) {
          console.log('Profile: Данные Twitch пользователя получены из DataStorage:', cachedUserData.id);
          setTwitchUserData(cachedUserData);
          setUserId(cachedUserData.id);
          setLoadingTwitchUser(false);
          return cachedUserData;
        }
      } catch (e) {
        console.error('Profile: Ошибка при получении данных Twitch из DataStorage:', e);
      }
    } else {
      console.log('Profile: Запрошено принудительное обновление данных Twitch, пропускаем кэш DataStorage');
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

      if (response.status === 401) {
          console.log('Profile: Не аутентифицирован (Twitch), перенаправление на /login');
          router.push('/login?reason=unauthenticated');
          return null;
      }
      
      if (!response.ok) {
          const errorText = await response.text();
          console.error('Profile: Ошибка при запросе Twitch пользователя к API:', response.status, errorText);
          throw new Error(`Ошибка API Twitch: ${response.status}`);
      }

      const apiUserData = await response.json();
      if (apiUserData && apiUserData.id) {
          console.log('Profile: Данные Twitch пользователя получены с API:', apiUserData.id);
          await DataStorage.saveData('user', apiUserData);
          setTwitchUserData(apiUserData);
          setUserId(apiUserData.id);
          setLoadingTwitchUser(false);
          return apiUserData;
      } else {
          console.error('Profile: Некорректные данные от API Twitch пользователя:', apiUserData);
          throw new Error('Получены некорректные данные Twitch пользователя');
      }

    } catch (apiError) {
      console.error('Profile: Ошибка при запросе Twitch к API или обработке:', apiError);
      setGlobalError('Не удалось загрузить основные данные профиля Twitch. Попробуйте обновить страницу.');
      setTwitchUserData(null);
      setLoadingTwitchUser(false);
      return null;
    }
  }, [router, searchParams]);

  const loadUserProfileDbData = useCallback(async () => {
    setLoadingProfileDb(true);
    setSpecificErrors(prev => ({ ...prev, profileDb: null }));
    console.log('Profile: Начало загрузки данных профиля из БД...');
    try {
        const response = await fetch(`/api/user-profile-data?_=${Date.now()}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
            credentials: 'include',
        });

        if (response.status === 401) {
            console.warn('Profile: Получен 401 при запросе данных из БД, хотя пользователь Twitch аутентифицирован.');
             setSpecificErrors(prev => ({ ...prev, profileDb: 'Ошибка аутентификации при доступе к данным профиля.' }));
             setUserProfileDbData(null);
             setLoadingProfileDb(false);
             return;
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Profile: Ошибка при загрузке данных профиля из БД:', response.status, errorData.error);
            throw new Error(errorData.error || `Ошибка ${response.status} при загрузке данных профиля`);
        }

        const data = await response.json();
        console.log('Profile: Данные профиля из БД успешно загружены:', data);
        setUserProfileDbData(data);

    } catch (error) {
        console.error('Profile: Крит. ошибка при загрузке данных профиля из БД:', error);
        setSpecificErrors(prev => ({ ...prev, profileDb: error.message || 'Не удалось загрузить доп. данные профиля.' }));
        setUserProfileDbData(null);
    } finally {
        setLoadingProfileDb(false);
    }
  }, []);

  const loadTierlists = useCallback(async (currentUserId) => {
    if (!currentUserId) return;
    try {
        console.log('Profile: Загрузка тирлистов для:', currentUserId);
        const response = await fetch(`/api/tierlists?userId=${currentUserId}&_=${Date.now()}`, {
            method: 'GET', headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }, credentials: 'include' });
        if (response.ok) {
            const data = await response.json();
            console.log('Profile: Тирлисты успешно загружены:', data?.length || 0);
        } else {
            console.error('Profile: Ошибка при загрузке тирлистов:', response.status);
        }
    } catch (error) {
        console.error('Profile: Ошибка при загрузке тирлистов:', error);
    }
  }, []);

  const loadReviews = useCallback(async (currentUserId) => {
      if (!currentUserId) return null;
      setLoadingReviews(true);
      setSpecificErrors(prev => ({ ...prev, reviews: null }));
      try {
          console.log('Profile: Загрузка отзывов для пользователя:', currentUserId);
          const response = await fetch(`/api/reviews?authorId=${currentUserId}&_=${Date.now()}`, {
              method: 'GET', headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }, credentials: 'include' });
          if (response.ok) {
              const data = await response.json();
              console.log('Profile: Отзывы успешно загружены:', data?.length || 0);
              return data;
          } else {
              console.error('Profile: Ошибка при загрузке отзывов:', response.status);
              setSpecificErrors(prev => ({ ...prev, reviews: 'Не удалось загрузить отзывы.' }));
              return null;
          }
      } catch (error) {
          console.error('Profile: Ошибка при загрузке отзывов:', error);
          setSpecificErrors(prev => ({ ...prev, reviews: 'Крит. ошибка загрузки отзывов.' }));
          return null;
      } finally {
          setLoadingReviews(false);
      }
  }, []);

  useEffect(() => {
    let isMounted = true;
    console.log("Profile: Запуск основного useEffect для загрузки данных");

    const loadAllData = async () => {
      const twitchData = await fetchTwitchUserData();
      
      if (!isMounted || !twitchData || !twitchData.id) {
          console.log("Profile: Основные данные Twitch не загружены или компонент размонтирован, прерываем загрузку остального.");
          return;
      }

      const currentUserId = twitchData.id;
      console.log(`Profile: Основные данные Twitch загружены (ID: ${currentUserId}). Запускаем параллельную загрузку остальных данных.`);

      await Promise.allSettled([
          loadUserProfileDbData(),
          loadTierlists(currentUserId),
      ]);

      if (isMounted) {
          console.log('Profile: Все параллельные загрузки завершены (или была попытка).');
           if (searchParams.get('refresh') === 'true' && window.history.replaceState) {
              const cleanUrl = window.location.pathname;
              window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
              console.log('Profile: Параметр refresh удален из URL.');
          }
      } else {
           console.log("Profile: Компонент размонтирован после завершения параллельных загрузок.");
      }
    };

    loadAllData();

    return () => {
      console.log("Profile: Компонент размонтирован, isMounted = false.");
      isMounted = false;
    };
  }, [fetchTwitchUserData, loadUserProfileDbData, loadTierlists, searchParams]); 

  const { isBirthday, daysToBirthday } = useMemo(() => {
      if (!userProfileDbData?.birthday) {
          return { isBirthday: false, daysToBirthday: null };
      }
      try {
          const birthDate = new Date(userProfileDbData.birthday);
          if (!isNaN(birthDate.getTime())) {
              return checkBirthday(birthDate);
          } else {
              console.warn('Profile: Невалидная дата рождения в userProfileDbData:', userProfileDbData.birthday);
              return { isBirthday: false, daysToBirthday: null };
          }
      } catch (e) {
          console.error('Profile: Ошибка вычисления дня рождения:', e);
          return { isBirthday: false, daysToBirthday: null };
      }
  }, [userProfileDbData?.birthday]);

  const isLoadingPage = loadingTwitchUser || loadingProfileDb;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Неверная дата';
        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
        return 'Ошибка даты';
    }
  };

  const renderBirthday = () => {
    if (!userProfileDbData?.birthday || !userProfileDbData?.show_birthday) return null;

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
  
  const renderSocialLinks = () => {
    const links = userProfileDbData?.social_links;
    
    if (loadingTwitchUser || loadingProfileDb) {
      return <div className={styles.smallLoader}></div>;
    }

    if (specificErrors.profileDb) {
         return (
            <div className={styles.sectionError}>
                 <span>{specificErrors.profileDb}</span>
                 <button onClick={loadUserProfileDbData} className={styles.retryButtonSmall} title="Повторить">↺</button>
            </div>
        );
    }

    if (!links || Object.keys(links).length === 0) {
      return (
        <div className={styles.emptySocialLinks}>
          Нет социальных ссылок.
          {twitchUserData?.id === userId && (
            <p>Добавьте их в разделе &quot;Редактировать профиль&quot;.</p>
          )}
        </div>
      );
    }
    
    const hasVisibleLinks = 
      links.twitch || 
      links.youtube || 
      links.discord || 
      links.telegram || 
      links.vk || 
      (links.isMusician && links.yandexMusic);
    
    if (!hasVisibleLinks) {
      return (
        <div className={styles.emptySocialLinks}>
          Нет активных социальных ссылок.
           {twitchUserData?.id === userId && (
            <p>Добавьте их в разделе &quot;Редактировать профиль&quot;.</p>
          )}
        </div>
      );
    }
    
    return (
      <div className={styles.socialLinks}>
        {links.twitch && (
          <SocialButton 
            type="twitch" 
            url={links.twitch} 
            username={links.twitch.split('/').pop() || 'Twitch'} 
          />
        )}
        {links.youtube && (
          <SocialButton 
            type="youtube" 
            url={links.youtube} 
            username={links.youtube.split('/').pop() || 'YouTube'} 
          />
        )}
        {links.discord && (
          <SocialButton 
            type="discord" 
            url={links.discord} 
            username={links.discord.split('/').pop() || 'Discord'} 
          />
        )}
        {links.telegram && (
          <SocialButton 
            type="telegram" 
            url={links.telegram} 
            username={links.telegram.split('/').pop() || 'Telegram'} 
          />
        )}
        {links.vk && (
          <SocialButton 
            type="vk" 
            url={links.vk} 
            username={links.vk.split('/').pop() || 'VK'} 
          />
        )}
        {links.isMusician && links.yandexMusic && (
          <SocialButton 
            type="yandexMusic" 
            url={links.yandexMusic} 
            username={links.yandexMusic.split('/').pop() || 'Я.Музыка'} 
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
      const newState = !showReviews;
      setShowReviews(newState);
      setShowAchievements(false);
      setShowStats(false);
      if (newState && userId && !loadingReviews) {
          loadReviews(userId);
      }
  };

  if (isLoadingPage) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.profileHeader}>
          <h1>Загрузка профиля...</h1>
          <div className={styles.spinner}></div> 
        </div>
      </div>
    );
  }

  if (globalError) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.error}>
          <h2>Произошла ошибка</h2>
          <p>{globalError}</p>
          <button onClick={() => fetchTwitchUserData(true)} className={styles.button}>
            Попробовать снова
          </button>
           <button className={styles.button} onClick={() => router.push('/menu')}>
            Вернуться в меню
          </button>
        </div>
      </div>
    );
  }

  if (!twitchUserData) {
    return (
      <div className={styles.profileContainer}>
         <div className={styles.error}>
           <h2>Не удалось загрузить данные профиля</h2>
           <p>Пожалуйста, попробуйте обновить страницу или вернуться в меню.</p>
           <button onClick={() => window.location.reload()} className={styles.button}>
             Обновить страницу
           </button>
           <button className={styles.button} onClick={() => router.push('/menu')}>
            Вернуться в меню
          </button>
        </div>
      </div>
    );
  }
  
  const { profile_image_url, display_name, login, view_count, broadcaster_type, created_at } = twitchUserData;
  const currentDescription = userProfileDbData?.description || twitchUserData.description;
  const visibilitySettings = userProfileDbData?.stats_visibility || {};

  const handleLogout = () => {
    try {
      console.log('Выполняем выход из аккаунта (клиентская версия)...');
      
      const cookieOptions = { path: '/', domain: window.location.hostname };
      Cookies.remove('twitch_access_token', cookieOptions);
      Cookies.remove('twitch_refresh_token', cookieOptions);
      Cookies.remove('twitch_token', cookieOptions);
      Cookies.remove('twitch_user', cookieOptions);
      Cookies.remove('twitch_auth_state', cookieOptions);
      Cookies.remove('sb-access-token', cookieOptions);
      Cookies.remove('sb-refresh-token', cookieOptions);
      Cookies.remove('has_local_storage_token', cookieOptions);
      
      DataStorage.clearAll();
      localStorage.removeItem('logged_out');
      
      console.log('Cookies и Local Storage очищены.');
      
      window.location.href = '/auth?action=logout'; 
    } catch (error) {
      console.error('Ошибка при выходе из аккаунта:', error);
      alert('Произошла ошибка при выходе из аккаунта. Вы будете перенаправлены на страницу авторизации.');
      window.location.href = '/auth';
    }
  };

  const retryLoading = (section) => {
      console.log(`Повторная попытка загрузки секции: ${section}`);
      if (!userId) {
          console.error('Невозможно повторить загрузку: userId отсутствует');
          return;
      }
      switch (section) {
          case 'profileDb': loadUserProfileDbData(); break;
          case 'tierlists': loadTierlists(userId); break;
          case 'reviews': loadReviews(userId); break;
          default: console.warn(`Неизвестная секция для повторной загрузки: ${section}`);
      }
  };

  return (
    <div className={styles.container}>
      <div className={styles.profileContainer}>
        <div className={styles.profileHeader}>
          <div className={styles.avatarContainer}>
            <CyberAvatar 
              src={profile_image_url || '/images/default-avatar.png'} 
              alt={display_name || login || 'Пользователь'} 
              size={150}
              className={styles.profileAvatar}
              layout="responsive"
              width={150}
              height={150}
              onError={(event) => { event.target.src = '/images/default-avatar.png'; }}
            />
          </div>
          <div className={styles.profileDetails}>
            <h1 className={styles.displayName}>{display_name || login}</h1>
            <div className={styles.profileStats}>
               {(visibilitySettings.followers !== false) && (
                 <div className={styles.profileStat}>
                  <span className={styles.statIcon}>👥</span>
                  <div className={styles.userStats}>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Подписчики Twitch</span>
                      {loadingState.followers ? (
                        <div className={styles.smallLoader}></div>
                      ) : errorMessages.followers ? (
                        <div className={styles.statError}>
                          <span className={styles.errorText}>Ошибка</span>
                          <button onClick={() => retryLoading('followers')} className={styles.retryButtonSmall} title="Повторить">↺</button>
                        </div>
                      ) : (
                        <span className={styles.statValue}>{totalFollowers.toLocaleString('ru-RU') ?? '0'}</span>
                      )}
                    </div>
                  </div>
                 </div>
               )}
               {(visibilitySettings.channel !== false) && view_count > 0 && (
                <div className={styles.profileStat}>
                  <span className={styles.statIcon}>👁️</span>
                  <span className={styles.statValue}>{view_count.toLocaleString('ru-RU')}</span>
                  <span className={styles.statLabel}>Просмотры Twitch</span>
                </div>
              )}
               {(visibilitySettings.channel !== false) && broadcaster_type && (
                <div className={styles.profileStat}>
                  <span className={styles.statIcon}>📺</span>
                  <span className={styles.statValue}>
                    {broadcaster_type === 'affiliate' ? 'Компаньон' : 
                     broadcaster_type === 'partner' ? 'Партнер' : 'Стример'}
                  </span>
                  <span className={styles.statLabel}>Тип канала Twitch</span>
                </div>
              )}
            </div>
            {renderBirthday()} 
          </div>
          <div className={styles.profileActions}>
            <button className={styles.achievementsButton} onClick={toggleAchievements} title="Посмотреть достижения">Достижения</button>
            <button className={styles.reviewsButton} onClick={toggleReviews} title="Отзывы о вас">⭐ Отзывы</button>
            <button className={styles.button} onClick={() => router.push('/edit-profile')}>Редактировать профиль</button>
            <button className={styles.button} onClick={() => router.push('/menu')}>Вернуться в меню</button>
            <button className={styles.logoutButton} onClick={handleLogout}>Выйти</button>
          </div>
        </div>
        
        {showAchievements ? (
          <div className={styles.achievementsSection}>
            <div className={styles.sectionHeader}><h2>Достижения</h2></div>
            {userId && (
                <AchievementsSystem 
                  userId={userId} 
                />
            )}
          </div>
        ) : showReviews ? (
          <div className={styles.reviewsContainer}>
            <div className={styles.sectionHeader}><h2>Ваши отзывы</h2></div>
             {loadingReviews ? (
                 <div className={styles.smallLoader}> Загрузка отзывов...</div>
             ) : specificErrors.reviews ? (
                 <div className={styles.sectionError}>
                     <span>{specificErrors.reviews}</span>
                     <button onClick={() => retryLoading('reviews')} className={styles.retryButtonSmall} title="Повторить">↺</button>
                 </div>
             ) : userId ? (
                 <ReviewSection 
                   userId={userId} 
                   isAuthor={true}
                 />
             ) : null}
          </div>
        ) : showStats ? (
          <div className={styles.statsContainer}>
            <div className={styles.sectionHeader}><h2>Статистика канала</h2></div>
            <div className={styles.statsGrid}>
               <p>Раздел статистики находится в разработке.</p>
                {(visibilitySettings.accountInfo !== false) && created_at && (
                    <div className={styles.statItem}>
                        <div className={styles.statIcon}>📅</div>
                        <div className={styles.statInfo}>
                            <div className={styles.statValue}>{formatDate(created_at)}</div>
                            <div className={styles.statLabel}>Дата создания Twitch</div>
                        </div>
                    </div>
                )}
                <div className={styles.statItem}>
                  <div className={styles.statIcon}>🔍</div>
                  <div className={styles.statInfo}>
                    <a 
                      href={`https://twitchtracker.com/${login}`} 
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
              <div className={styles.profileDescription}>
                <h3 className={styles.sectionTitle}>Описание</h3>
                {loadingProfileDb ? (
                  <div className={styles.smallLoader}></div>
                ) : specificErrors.profileDb ? (
                  <div className={styles.sectionError}>
                    <span>{specificErrors.profileDb}</span>
                    <button onClick={loadUserProfileDbData} className={styles.retryButtonSmall} title="Повторить">↺</button>
                  </div>
                ) : currentDescription ? (
                  <p>{currentDescription}</p>
                ) : (
                  <div className={styles.emptyDescription}>
                    <p>Нет описания профиля.</p>
                     {twitchUserData?.id === userId && (
                      <p>Добавьте его в разделе &quot;Редактировать профиль&quot;.</p>
                     )}
                  </div>
                )}
              </div>
              <div className={styles.socialLinksSection}>
                <h3 className={styles.sectionTitle}>Социальные сети</h3>
                <div className={styles.sectionDescription}>
                  <p>
                    Здесь вы можете настроить социальные ссылки, которые будут отображаться в вашем профиле.
                    Используйте полные URL (например, <code className={styles.codeText}>&quot;https://twitch.tv/yourchannel&quot;</code>),
                    чтобы ссылки работали корректно.
                  </p>
                </div>
                {renderSocialLinks()}
              </div>
            </div>
            <div className={styles.sectionDescription}>
              <p>
                Здесь вы можете найти ответы на часто задаваемые вопросы о Streamers Universe,
                например, <code className={styles.codeText}>&quot;Как получить роль модератора?&quot;</code> или
                <code className={styles.codeText}>&quot;Как добавить свое расписание?&quot;</code>.
              </p>
            </div>
          </>
        )}
        <div className={styles.loadingErrors}>
          {Object.entries(specificErrors).map(([key, errorMsg]) => {
            if (!errorMsg || ['profileDb', 'reviews'].includes(key)) return null; 
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