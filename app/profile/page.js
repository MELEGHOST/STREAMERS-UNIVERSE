'use client';

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './profile.module.css';
import SocialButton from '../components/SocialButton';
import AchievementsSystem from '../components/AchievementsSystem';
import ReviewSection from '../components/ReviewSection';
import { checkBirthday } from '../utils/birthdayCheck';
import { DataStorage } from '../utils/dataStorage';
import { createBrowserClient } from '@supabase/ssr';
import CyberAvatar from '../components/CyberAvatar';

// Компонент-заглушка для Suspense
function ProfileLoadingFallback() {
  return (
    <div className={styles.container}>
      <div className={styles.profileContainer}>
        <div className={styles.profileHeader}>
          <h1>Загрузка профиля...</h1>
          <div className={styles.spinner}></div>
        </div>
      </div>
    </div>
  );
}

// Оборачиваем основной компонент в Suspense
export default function ProfilePageWrapper() {
  return (
    <Suspense fallback={<ProfileLoadingFallback />}>
      <Profile />
    </Suspense>
  );
}

function Profile() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [twitchUserData, setTwitchUserData] = useState(null);
  const [loadingTwitchUser, setLoadingTwitchUser] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const [globalError, setGlobalError] = useState(null);
  const [specificErrors, setSpecificErrors] = useState({});

  const [showAchievements, setShowAchievements] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [showStats, setShowStats] = useState(false);
  
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const supabase = useMemo(() => 
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ), 
  []);

  const fetchTwitchUserData = useCallback(async (authenticatedUserId, forceRefresh = false) => {
    if (!authenticatedUserId) return null;

    setLoadingTwitchUser(true);
    setGlobalError(null);
    console.log(`Profile: Начало загрузки данных Twitch пользователя для ${authenticatedUserId}...`);

    const shouldRefresh = forceRefresh || searchParams.get('refresh') === 'true';

    if (!shouldRefresh) {
      try {
        const cachedUserData = await DataStorage.getData('user');
        if (cachedUserData && cachedUserData.id === authenticatedUserId) {
          console.log('Profile: Данные Twitch пользователя получены из DataStorage:', cachedUserData.id);
          setTwitchUserData(cachedUserData);
          setLoadingTwitchUser(false);
          return cachedUserData;
        }
      } catch (e) {
        console.warn('Profile: Ошибка при получении данных Twitch из DataStorage:', e);
      }
    }

    try {
      console.log('Profile: Текущие document.cookie перед fetch /api/twitch/user:', document.cookie);

      const response = await fetch('/api/twitch/user', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache'
        },
        credentials: 'include'
      });

      console.log(`Profile: Получен статус ответа от /api/twitch/user: ${response.status}`);

      if (response.status === 401) {
          console.warn('Profile: Не аутентифицирован (ответ 401 от API /api/twitch/user). Сессия могла истечь.');
          setGlobalError('Сессия истекла или недействительна.');
      }
      
      if (!response.ok) {
          const errorText = await response.text();
          console.error('Profile: Ошибка при запросе Twitch пользователя к API:', response.status, errorText);
          setGlobalError(`Ошибка API Twitch: ${response.status}`);
      }

      const apiUserData = await response.json();
      if (apiUserData && apiUserData.id) {
          console.log('Profile: Данные Twitch пользователя получены с API:', apiUserData.id);
          if (apiUserData.id === authenticatedUserId) {
              await DataStorage.saveData('user', apiUserData);
              setTwitchUserData(apiUserData);
          } else {
              console.warn('Profile: ID пользователя из API не совпадает с ID из сессии!')
              setGlobalError('Несоответствие данных пользователя.');
              setTwitchUserData(null);
          }
          setLoadingTwitchUser(false);
          return apiUserData;
      } else {
          console.error('Profile: Некорректные данные от API Twitch пользователя:', apiUserData);
          throw new Error('Получены некорректные данные Twitch пользователя');
      }

    } catch (apiError) {
      console.error('Profile: Ошибка в блоке catch fetchTwitchUserData:', apiError);
      setGlobalError('Не удалось загрузить основные данные профиля Twitch. Попробуйте обновить страницу.');
      setTwitchUserData(null);
      setLoadingTwitchUser(false);
      return null;
    }
  }, [searchParams]);

  const loadUserProfileDbData = useCallback(async (authenticatedUserId) => {
    if (!authenticatedUserId) return;
    setLoadingProfile(true);
    setSpecificErrors(prev => ({ ...prev, profileDb: null }));
    console.log(`Profile: Загрузка данных профиля из БД для ${authenticatedUserId}...`);
    try {
        const { data: profileData, error: profileDbError } = await supabase
            .from('user_profiles')
            .select('description, birthday, show_birthday, social_links, stats_visibility')
            .eq('user_id', authenticatedUserId)
            .maybeSingle();

        if (profileDbError) {
            console.error('Profile: Ошибка загрузки профиля из БД:', profileDbError);
            setSpecificErrors(prev => ({ ...prev, profileDb: 'Ошибка загрузки данных профиля из БД.' }));
            setUserProfile(null);
        } else if (profileData) {
            console.log('Profile: Данные профиля из БД загружены:', profileData);
            setUserProfile({
                description: profileData.description || '',
                birthday: profileData.birthday,
                show_birthday: profileData.show_birthday !== undefined ? profileData.show_birthday : true,
                social_links: profileData.social_links || {},
                stats_visibility: profileData.stats_visibility || { followers: true, followings: true, streams: true, channel: true, accountInfo: true }
            });
        } else {
             console.log('Profile: Профиль в БД не найден, используем пустые значения по умолчанию.');
             setUserProfile({
                description: '',
                birthday: null,
                show_birthday: true,
                social_links: {},
                stats_visibility: { followers: true, followings: true, streams: true, channel: true, accountInfo: true }
             });
        }
    } catch (error) {
        console.error('Profile: Общая ошибка загрузки профиля из БД:', error);
        if (!specificErrors.profileDb) {
            setSpecificErrors(prev => ({ ...prev, profileDb: 'Крит. ошибка при загрузке профиля.' }));
        }
        setUserProfile(null);
    } finally {
        setLoadingProfile(false);
    }
  }, [supabase, specificErrors.profileDb]);

  const loadTierlists = useCallback(async (authorId) => {
    if (!authorId) return;
    try {
        console.log('Profile: Загрузка тирлистов для:', authorId);
        const response = await fetch(`/api/tierlists?userId=${authorId}&_=${Date.now()}`, {
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
    setAuthLoading(true);
    console.log("Profile: useEffect onAuthStateChange Сработал");

    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            console.log("Profile: Начальная сессия найдена", session.user.id);
            setCurrentUser(session.user);
            fetchTwitchUserData(session.user.id);
            loadUserProfileDbData(session.user.id);
        } else {
            console.log("Profile: Начальная сессия НЕ найдена");
            setCurrentUser(null);
            router.push('/auth?reason=initial_no_session'); 
        }
         setAuthLoading(false);
    }).catch(err => {
        console.error("Profile: Ошибка при начальной проверке сессии", err);
        setCurrentUser(null);
        setAuthLoading(false);
        setGlobalError("Ошибка проверки сессии при загрузке.");
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`Profile: Событие AuthStateChange: ${event}`);
      if (event === 'SIGNED_IN' && session) {
        console.log('Profile: Пользователь вошел (SIGNED_IN)', session.user.id);
        setCurrentUser(session.user);
         setAuthLoading(false);
         if (!twitchUserData || twitchUserData.id !== session.user.id) {
             fetchTwitchUserData(session.user.id);
         }
         if (!userProfile || currentUser?.id !== session.user.id) {
             loadUserProfileDbData(session.user.id);
         }
      } else if (event === 'SIGNED_OUT') {
        console.log('Profile: Пользователь вышел (SIGNED_OUT)');
        setCurrentUser(null);
        setTwitchUserData(null);
        setUserProfile(null);
        DataStorage.clearData('user').catch(e => console.warn("Failed to clear user cache on logout", e));
         setAuthLoading(false);
        router.push('/auth?reason=signed_out');
      } else if (event === 'INITIAL_SESSION') {
         console.log("Profile: Событие INITIAL_SESSION получено");
         if(session) {
            setCurrentUser(session.user);
         } else {
            setCurrentUser(null);
            router.push('/auth?reason=initial_session_null'); 
         }
         setAuthLoading(false);
      }
       else if (event === 'TOKEN_REFRESHED' && session) {
           console.log('Profile: Токен обновлен (TOKEN_REFRESHED)');
           setCurrentUser(session.user);
       }
    });

    return () => {
      if (authListener && authListener.subscription) {
          authListener.subscription.unsubscribe();
          console.log("Profile: Отписались от onAuthStateChange");
      }
    };
  }, [supabase, router, fetchTwitchUserData, loadUserProfileDbData]);

  const { isBirthday, daysToBirthday } = useMemo(() => {
      if (!userProfile?.birthday) {
          return { isBirthday: false, daysToBirthday: null };
      }
      try {
          const birthDate = new Date(userProfile.birthday);
          if (!isNaN(birthDate.getTime())) {
              return checkBirthday(birthDate);
          } else {
              console.warn('Profile: Невалидная дата рождения в userProfile:', userProfile.birthday);
              return { isBirthday: false, daysToBirthday: null };
          }
      } catch (e) {
          console.error('Profile: Ошибка вычисления дня рождения:', e);
          return { isBirthday: false, daysToBirthday: null };
      }
  }, [userProfile?.birthday]);

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
    if (!userProfile?.birthday /* || !userProfile?.show_birthday */) return null;

    if (isBirthday) {
      return (
        <div className={styles.birthdayContainer}>
          <span className={styles.birthdayIcon}>🎂</span>
          <span className={styles.birthdayText}>С днем рождения!</span>
        </div>
      );
    }
    
    if (daysToBirthday !== null && daysToBirthday > 0 && daysToBirthday <= 15) {
        const birthDate = new Date(userProfile.birthday);
        birthDate.setFullYear(new Date().getFullYear());
        const formattedDate = birthDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });

      return (
        <div className={styles.birthdayContainer}>
          <span className={styles.birthdayIcon}>🎉</span>
          <span className={styles.birthdayText}>
            Скоро день рождения! ({formattedDate})
          </span>
        </div>
      );
    }
    
    return null;
  };
  
  const renderSocialLinks = () => {
    const links = userProfile?.social_links;
    
    if (loadingTwitchUser || loadingProfile) {
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
          {twitchUserData?.id === currentUser?.id && (
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
           {twitchUserData?.id === currentUser?.id && (
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
      if (newState && currentUser?.id && !loadingReviews) {
          loadReviews(currentUser.id);
      }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;

    try {
      console.log('Выполняем выход из аккаунта через Supabase...');
      setIsLoggingOut(true);
      
      const { error } = await supabase.auth.signOut();
      
      DataStorage.clearAll();
      
      if (error) {
          console.error('Ошибка при выходе из Supabase:', error);
          alert(`Ошибка при выходе: ${error.message}`);
      } else {
          console.log('Выход из Supabase успешен. Перенаправление на /auth');
          router.push('/auth?action=logout');
      }

    } catch (error) {
      console.error('Критическая ошибка при выходе из аккаунта:', error);
      alert('Произошла критическая ошибка при выходе из аккаунта.');
      router.push('/');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const retryLoading = (section) => {
      console.log(`Повторная попытка загрузки секции: ${section}`);
      if (!currentUser?.id) {
          console.error('Невозможно повторить загрузку: currentUser.id отсутствует');
          return;
      }
      switch (section) {
          case 'profileDb': loadUserProfileDbData(currentUser.id); break;
          case 'tierlists': loadTierlists(currentUser.id); break;
          case 'reviews': loadReviews(currentUser.id); break;
          default: console.warn(`Неизвестная секция для повторной загрузки: ${section}`);
      }
  };

  // Используем данные из userProfile (БД) и twitchUserData (API/кэш)
  const { description: profileDescriptionDb, social_links: profileSocialLinksDb } = userProfile || {};
  const { profile_image_url, login, display_name: twitchDisplayName, view_count, broadcaster_type, created_at, followers_count } = twitchUserData || {};

  // Определяем имя и аватар для отображения
  // Приоритет: Twitch API (display_name -> login), затем generic
  const finalDisplayName = twitchDisplayName || login || 'Пользователь';
  // Приоритет: Twitch API, затем generic
  const finalAvatarUrl = profile_image_url || '/default-avatar.png';

  // Берем описание из БД, если есть, иначе из Twitch API, иначе пусто
  const profileDescription = profileDescriptionDb || twitchUserData?.description || ''; 
  
  // Настройки видимости (пока не используются, но могут понадобиться)
  // const visibilitySettings = userProfile?.stats_visibility || {};
  const socialLinks = profileSocialLinksDb || {}; // Используем данные из БД

  // Добавляем состояние загрузки аутентификации
  if (authLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.profileContainer}>
          <div className={styles.profileHeader}>
            <h1>Проверка аутентификации...</h1>
            <div className={styles.spinner}></div>
          </div>
        </div>
      </div>
    );
  }
  
  // Если пользователь не аутентифицирован после проверки (на всякий случай)
  if (!currentUser && !authLoading) {
      console.log("Profile: Пользователь не аутентифицирован после загрузки, редирект на /auth");
      return (
         <div className={styles.container}>
           <div className={styles.profileContainer}>
             <div className={styles.profileHeader}>
               <h1>Ошибка аутентификации</h1>
               <p>Пожалуйста, <a href="/auth">войдите</a>.</p>
             </div>
           </div>
         </div>
      );
  }

  // Основной рендер компонента, когда пользователь аутентифицирован
  // Используем twitchUserData и userProfile для отображения
  return (
    <div className={styles.container}>
      <div className={styles.profileContainer}>
        {globalError && (
          <div className={styles.globalErrorContainer}>
            <span className={styles.errorIcon}>⚠️</span> 
            <p>{globalError}</p>
             <button 
                 onClick={() => {
                     setGlobalError(null); 
                     if(currentUser?.id) {
                        fetchTwitchUserData(currentUser.id, true);
                        loadUserProfileDbData(currentUser.id);
                     }
                 }}
                 className={styles.retryButtonSmall}
                 title="Попробовать снова"
              >
                 Обновить
             </button>
          </div>
        )}
        <div className={styles.profileHeader}>
          <div className={styles.avatarContainer}>
            <CyberAvatar 
              src={finalAvatarUrl} 
              alt={finalDisplayName} 
              size={150}
              className={styles.profileAvatar}
              layout="responsive"
              width={150}
              height={150}
              onError={(event) => { event.target.src = '/default-avatar.png'; }} 
            />
          </div>
          <div className={styles.profileDetails}>
             <h1 className={styles.displayName}>{finalDisplayName}</h1>
             {/* Используем описание из profileDescription */} 
             <p className={styles.description}>{profileDescription || 'Описание отсутствует'}</p>
             <div className={styles.profileStats}>
               {/* Добавляем проверки на существование twitchUserData перед доступом к полям */} 
               {followers_count !== null && followers_count !== undefined && (
                  <span className={styles.statItem}>Подписчики: {followers_count}</span>
               )}
               {view_count !== null && view_count !== undefined && (
                  <span className={styles.statItem}>Просмотры: {view_count}</span>
               )}
               {broadcaster_type && (
                  <span className={styles.statItem}>Тип: {broadcaster_type}</span>
               )}
               {created_at && (
                  <span className={styles.statItem}>На Twitch с: {formatDate(created_at)}</span>
               )}
             </div>
             {/* День рождения и социальные сети */} 
             {renderBirthday()} 
             {renderSocialLinks()} 
          </div>
          <div className={styles.profileActions}>
            <button 
              onClick={handleLogout}
              className={`${styles.actionButton} ${styles.logoutButton}`}
              disabled={isLoggingOut}
            >
               {isLoggingOut ? 'Выход...' : 'Выйти'}
            </button>
            <button 
                onClick={() => router.push('/edit-profile')} 
                className={`${styles.actionButton} ${styles.editButton}`}
            >
                Редактировать
            </button>
            {/* Кнопки для достижений и обзоров - добавляем класс actionButton */} 
            <button onClick={toggleAchievements} className={`${styles.actionButton} ${styles.toggleButton}`}>
                {showAchievements ? 'Скрыть достижения' : 'Показать достижения'} ({/* Количество */})
            </button>
            <button onClick={toggleReviews} className={`${styles.actionButton} ${styles.toggleButton}`}>
                {showReviews ? 'Скрыть обзоры' : 'Показать обзоры'} ({/* Количество */})
            </button>
          </div>
        </div>
        
        {showAchievements ? (
          <div className={styles.achievementsSection}>
            <div className={styles.sectionHeader}><h2>Достижения</h2></div>
            {currentUser?.id && (
                <AchievementsSystem 
                  userId={currentUser.id} 
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
             ) : currentUser?.id ? (
                 <ReviewSection 
                   userId={currentUser.id} 
                   isAuthor={true}
                 />
             ) : null}
          </div>
        ) : showStats ? (
          <div className={styles.statsContainer}>
            <div className={styles.sectionHeader}><h2>Статистика канала</h2></div>
            <div className={styles.statsGrid}>
               <p>Раздел статистики находится в разработке.</p>
                {(socialLinks.accountInfo !== false) && created_at && (
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
                {loadingProfile ? (
                  <div className={styles.smallLoader}></div>
                ) : specificErrors.profileDb ? (
                  <div className={styles.sectionError}>
                    <span>{specificErrors.profileDb}</span>
                    <button onClick={loadUserProfileDbData} className={styles.retryButtonSmall} title="Повторить">↺</button>
                  </div>
                ) : profileDescription ? (
                  <p>{profileDescription}</p>
                ) : (
                  <div className={styles.emptyDescription}>
                    <p>Нет описания профиля.</p>
                     {twitchUserData?.id === currentUser?.id && (
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