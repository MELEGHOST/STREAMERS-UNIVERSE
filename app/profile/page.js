'use client';

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
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
  
  const [twitchUserData, setTwitchUserData] = useState(null);
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
  
  const [userId, setUserId] = useState(null);
  const [hasCheckedAdmin, setHasCheckedAdmin] = useState(false);
  const [showEditMode, ] = useState(false);
  const [editedDisplayName, ] = useState('');
  const [dbDisplayName, ] = useState('');
  const [dbAvatarUrl, ] = useState('');

  const supabase = useMemo(() => 
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ), 
  []);

  useEffect(() => {
    if (currentUser && currentUser.id) {
      setUserId(currentUser.id);
    } else {
      setUserId(null);
    }
  }, [currentUser]);

  const checkAdminAccess = useCallback(async () => {
    try {
      console.log('Профиль: Запрос прав администратора через API...');
      const response = await fetch('/api/auth/check-admin', {
         method: 'GET',
         headers: {
            'Content-Type': 'application/json',
         }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Профиль: Ошибка API при проверке прав (${response.status}):`, errorData.error || response.statusText);
        return { isAdmin: false, role: null }; 
      }
      
      const data = await response.json();
      console.log('Профиль: Результат проверки прав администратора:', data);
      return { isAdmin: data.isAdmin, role: data.role };

    } catch (error) {
      console.error('Профиль: Непредвиденная ошибка при вызове API проверки прав:', error);
      return { isAdmin: false, role: null };
    }
  }, []);

  const fetchTwitchUserData = useCallback(async () => {
    if (!userId) {
        console.log("Профиль (fetchTwitchUserData): userId отсутствует, выход.");
        return;
    }
    setGlobalError(null);
    let dataToSet = null;

    try {
      let cachedData = null;
      if (typeof window !== 'undefined') { 
        try {
          const storedData = localStorage.getItem('twitch_user');
          if (storedData) {
            cachedData = JSON.parse(storedData);
            console.log('Профиль: найдены кэшированные данные в localStorage');
            dataToSet = cachedData;
          }
        } catch (e) {
          console.error('Ошибка при чтении из localStorage:', e);
        }
      }

      const apiUrl = `/api/twitch/user?userId=${userId}`;
      console.log(`Профиль: запрос к ${apiUrl}`);
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Профиль: ошибка API /api/twitch/user (${response.status}):`, errorText);
        if (response.status === 401 && !cachedData) {
            console.log('Профиль: 401 и нет кэша, перенаправляем на /auth');
            router.push('/auth?reason=api_unauthorized');
            return;
        }
        if (!cachedData) {
             throw new Error(`Ошибка при получении данных: ${response.status} ${errorText}`);
        }
      } else {
          const data = await response.json();
          console.log('Профиль: получены СВЕЖИЕ данные пользователя Twitch:', data);
          if (data && data.id) {
            dataToSet = data;
            if (typeof window !== 'undefined') { 
              try {
                localStorage.setItem('twitch_user', JSON.stringify(data));
              } catch (e) {
                console.error('Ошибка при сохранении в localStorage:', e);
              }
            }
          } else {
             console.warn('Профиль: получен пустой ответ или отсутствует ID пользователя от API');
             if (!cachedData) {
                 throw new Error('Не удалось получить данные пользователя');
             }
          }
      }
      
    } catch (error) {
      console.error('Профиль: ошибка при получении данных пользователя:', error);
      setGlobalError(`Ошибка при получении данных пользователя: ${error.message}`);
      if (!dataToSet) {
           console.error("Профиль: Ошибка загрузки и нет кэшированных данных.");
      }
    } finally {
       if (dataToSet) {
           setTwitchUserData(dataToSet);
           const idToCheck = dataToSet.twitchId || dataToSet.id;
           if (!hasCheckedAdmin && idToCheck) {
             checkAdminAccess(idToCheck);
             setHasCheckedAdmin(true);
           }
       }
    }
  }, [userId, router, checkAdminAccess, hasCheckedAdmin]);

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
            const errorMessage = `Ошибка загрузки данных профиля: ${profileDbError.message || 'Неизвестная ошибка'}`;
            setSpecificErrors(prev => ({ ...prev, profileDb: errorMessage }));
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
        const errorMessage = `Ошибка загрузки профиля: ${error.message || 'Неизвестная ошибка'}`;
        if (!specificErrors.profileDb) {
            setSpecificErrors(prev => ({ ...prev, profileDb: errorMessage }));
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

  // Эффект для загрузки данных при изменении userId (который зависит от currentUser)
  useEffect(() => {
    // Добавляем лог для проверки срабатывания и значения userId
    console.log(`Profile: useEffect[userId] сработал. Текущий userId: ${userId}`); 
    if (userId) {
      console.log(`Profile: UserId (${userId}) ЕСТЬ, запускаем загрузку данных...`);
      fetchTwitchUserData(); 
      loadUserProfileDbData(userId);
      loadTierlists(userId);
      loadReviews(userId);
    } else {
      console.log("Profile: UserId сброшен или отсутствует, данные не загружаем.");
      setTwitchUserData(null);
      setUserProfile(null);
      // Сбросить другие данные, если нужно
    }
    // Убираем функции из зависимостей, оставляем только userId
  }, [userId]); 

  // Эффект для прослушивания изменений состояния аутентификации
  useEffect(() => {
    console.log("Profile: useEffect onAuthStateChange Сработал");
    let isActive = true;
    let authListener = null;

    async function initializeAuth() {
      console.log("Profile: Попытка получить начальную сессию...");
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (!isActive) return;

      if (sessionError) {
        console.error("Profile: Ошибка при получении начальной сессии:", sessionError);
        setAuthLoading(false);
        return;
      }

      if (session) {
        console.log(`Profile: Начальная сессия найдена ${session.user.id}`);
        setCurrentUser(session.user);
        setUserId(session.user.id); // Установка userId здесь вызовет useEffect выше
      } else {
        console.log("Profile: Начальная сессия не найдена.");
        // Если сессии нет, возможно, стоит перенаправить на /auth?
        // router.push('/auth?reason=no_initial_session');
      }
      setAuthLoading(false);

      console.log("Profile: Подписка на onAuthStateChange...");
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (!isActive) return; // Предотвращаем обновление после размонтирования
        
        console.log("Profile: Событие AuthStateChange:", event, ", Session:", !!session);
        setCurrentUser(session?.user ?? null);
        
        // Обновляем userId только если он изменился
        const newUserId = session?.user?.id ?? null;
        setUserId(currentUserId => {
          if (currentUserId !== newUserId) {
            console.log(`Profile: UserId обновлен через onAuthStateChange на ${newUserId}`);
            return newUserId;
          }
          return currentUserId;
        });

        // Убираем явный вызов fetchTwitchUserData отсюда

        if (event === 'SIGNED_OUT') {
          console.log("Profile: Пользователь вышел, очищаем данные.");
          setTwitchUserData(null);
          setUserProfile(null);
        }
        // Не нужно устанавливать authLoading здесь снова, т.к. начальная загрузка завершена
      });
      authListener = data; // Сохраняем для отписки
    }

    initializeAuth();

    // Отписка при размонтировании компонента
    return () => {
      isActive = false;
      if (authListener && authListener.subscription) {
          authListener.subscription.unsubscribe();
          console.log("Profile: Отписались от onAuthStateChange");
      }
    };
    // Убираем fetchTwitchUserData из зависимостей
  }, [supabase, router, currentUser?.id]); 

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
    
    if (/* loadingTwitchUser || */ loadingProfile) {
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

    setIsLoggingOut(true);
    console.log('Выполняем выход из аккаунта через Supabase...');
    setGlobalError(null);

    let signOutError = null;

    try {
      const { error } = await supabase.auth.signOut();
      signOutError = error;

      try {
          console.log('Попытка очистки DataStorage...');
          await DataStorage.clearAll();
          console.log('DataStorage успешно очищен.');
      } catch (storageError) {
          console.error('Ошибка при очистке DataStorage:', storageError);
          setGlobalError('Не удалось полностью очистить локальные данные, но выход выполнен.');
      }

      if (signOutError) {
          console.error('Ошибка при выходе из Supabase:', signOutError);
          setGlobalError(`Ошибка при выходе: ${signOutError.message}`);
      } else {
          console.log('Выход из Supabase успешен. Перенаправление на /auth');
          router.push('/auth?action=logout');
      }

    } catch (criticalError) {
      console.error('Критическая ошибка при выходе из аккаунта (внешний catch):', criticalError);
      setGlobalError('Произошла критическая ошибка при выходе из аккаунта.');
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

  const { description: profileDescriptionDb, social_links: profileSocialLinksDb } = userProfile || {};
  const { profile_image_url, login, display_name: twitchDisplayName, view_count, broadcaster_type, created_at, followers_count } = twitchUserData || {};

  console.log('Profile DEBUG twitchUserData:', twitchUserData ? JSON.stringify({ 
    profile_image_url, login, display_name: twitchDisplayName 
  }) : 'null');

  const finalDisplayName = showEditMode 
    ? editedDisplayName 
    : (
        dbDisplayName || 
        (twitchDisplayName) || 
        (login) || 
        "Стример"
      );

  const defaultAvatar = "/images/default_avatar.png";
  
  let finalAvatarUrl = null;
  
  if (dbAvatarUrl) {
    finalAvatarUrl = dbAvatarUrl;
  } else if (twitchUserData?.profile_image_url) {
    finalAvatarUrl = twitchUserData.profile_image_url;
  } else {
    try {
      const storedTwitchUser = localStorage.getItem('twitch_user');
      if (storedTwitchUser) {
        const parsedUser = JSON.parse(storedTwitchUser);
        if (parsedUser?.profile_image_url) {
          finalAvatarUrl = parsedUser.profile_image_url;
        }
      }
    } catch (error) {
      console.error("Ошибка при получении данных аватара из localStorage:", error);
    }
    
    if (!finalAvatarUrl) {
      finalAvatarUrl = defaultAvatar;
    }
  }

  console.log("Профиль: URL аватара для отображения:", finalAvatarUrl);

  const profileDescription = profileDescriptionDb || twitchUserData?.description || '';

  const socialLinks = profileSocialLinksDb || {};

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
              alt={`Аватар ${finalDisplayName}`}
              size="xl"
              className={`userAvatar ${styles.profileAvatar}`}
              layout="fixed"
              width={100}
              height={100}
              priority={true}
              onError={() => console.error("Ошибка загрузки аватара с URL:", finalAvatarUrl)}
            />
          </div>
          <div className={styles.profileDetails}>
             <h1 className={styles.displayName}>{finalDisplayName}</h1>
             <p className={styles.description}>{profileDescription || 'Описание отсутствует'}</p>
             <div className={styles.profileStats}>
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