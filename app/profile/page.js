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
  
  const [userId, setUserId] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState(null);

  const supabase = useMemo(() => 
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ), 
  []);

  const fetchTwitchUserData = useCallback(async (forceRefresh = false) => {
    setLoadingTwitchUser(true);
    setGlobalError(null);
    console.log('Profile: Начало загрузки данных Twitch пользователя...');

    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
            console.error('Profile: Ошибка при проверке сессии Supabase перед запросом к API:', sessionError);
            throw new Error('Ошибка проверки сессии');
        }
        if (!session) {
            console.log('Profile: Сессия Supabase НЕ найдена НА КЛИЕНТЕ перед запросом к API. Перенаправление на /auth.');
            router.push('/auth?reason=no_client_session');
            setLoadingTwitchUser(false);
            return null;
        }
        console.log('Profile: Сессия Supabase НА КЛИЕНТЕ найдена перед запросом к API.');
    } catch (e) {
        console.error('Profile: Критическая ошибка при проверке сессии Supabase на клиенте:', e);
        setGlobalError('Ошибка проверки сессии. Попробуйте обновить страницу или войти снова.');
        setLoadingTwitchUser(false);
        return null;
    }

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
          console.log('Profile: Не аутентифицирован (ответ 401 от API /api/twitch/user), перенаправление на /auth');
          router.push('/auth?reason=api_unauthorized');
          setLoadingTwitchUser(false);
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
      console.error('Profile: Ошибка в блоке catch fetchTwitchUserData:', apiError);
      console.error('Profile: Ошибка при запросе Twitch к API или обработке:', apiError);
      setGlobalError('Не удалось загрузить основные данные профиля Twitch. Попробуйте обновить страницу.');
      setTwitchUserData(null);
      setLoadingTwitchUser(false);
      return null;
    }
  }, [router, searchParams, supabase]);

  const loadUserProfileDbData = useCallback(async () => {
    setLoadingProfile(true);
    setProfileError(null);
    console.log('Profile: Загрузка данных профиля из БД...');
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
            throw new Error('Сессия не найдена для загрузки профиля БД');
        }
        const userId = session.user.id;

        const { data: profileData, error: profileDbError } = await supabase
            .from('user_profiles')
            .select('username, avatar_url, description, birthday, social_links')
            .eq('user_id', userId)
            .single();

        if (profileDbError) {
            console.error('Profile: Ошибка загрузки профиля из БД:', profileDbError);
            setProfileError('Не удалось загрузить данные профиля.');
            setUserProfile(null);
        } else if (profileData) {
            console.log('Profile: Данные профиля из БД загружены:', profileData);
            setUserProfile(profileData);
        } else {
             console.log('Profile: Профиль в БД не найден для пользователя:', userId);
             setUserProfile(null);
        }
    } catch (error) {
        console.error('Profile: Общая ошибка загрузки профиля из БД:', error);
        setProfileError('Произошла ошибка при загрузке профиля.');
        setUserProfile(null);
    } finally {
        setLoadingProfile(false);
    }
  }, [supabase]);

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
          if (isMounted) {
              setLoadingTwitchUser(false);
              setLoadingProfile(false);
          }
          return;
      }

      const currentTwitchUserId = twitchData.id;
      console.log(`Profile: Основные данные Twitch загружены (ID: ${currentTwitchUserId}). Запускаем параллельную загрузку остальных данных.`);

      await Promise.allSettled([
          loadUserProfileDbData(),
          loadTierlists(currentTwitchUserId),
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

  const isLoadingPage = loadingTwitchUser || loadingProfile;

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

  if (globalError || profileError) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.error}>
          <h2>Произошла ошибка</h2>
          <p>{globalError || profileError}</p>
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
  const currentDescription = userProfile?.description || twitchUserData.description;
  const visibilitySettings = userProfile?.stats_visibility || {};

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
                    {twitchUserData?.followers_count !== null && typeof twitchUserData?.followers_count !== 'undefined' && (
                        <div className={styles.statItem}>
                          <span className={styles.statLabel}>Подписчики Twitch</span>
                          <span className={styles.statValue}>{twitchUserData.followers_count.toLocaleString('ru-RU')}</span>
                        </div>
                    )}
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
            <button className={styles.logoutButton} onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? 'Выход...' : 'Выйти'}
            </button>
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
                {loadingProfile ? (
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