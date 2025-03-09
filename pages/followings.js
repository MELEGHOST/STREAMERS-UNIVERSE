import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import styles from './followers.module.css';
import { useAuth } from '../contexts/AuthContext';

export default function Followings() {
  const router = useRouter();
  const { isAuthenticated, userId, userLogin } = useAuth();
  
  const [followings, setFollowings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalFollowings, setTotalFollowings] = useState(0);
  
  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    
    const fetchFollowings = async () => {
      try {
        setLoading(true);
        
        // Получаем токен из localStorage
        const token = localStorage.getItem('twitch_token');
        
        if (!token) {
          throw new Error('Токен авторизации не найден');
        }
        
        // Используем API роут вместо прямого обращения к Twitch API
        const response = await fetch(`/api/twitch/followings?userId=${userId}`, {
          method: 'GET',
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Ошибка сервера' }));
          throw new Error(errorData.error || 'Не удалось загрузить данные о фолловингах');
        }
        
        const data = await response.json();
        
        // Обрабатываем полученные данные
        if (data && data.followings && Array.isArray(data.followings)) {
          // Сохраняем данные о пользователях, на которых подписаны
          setFollowings(data.followings);
          setTotalFollowings(data.total || data.followings.length);
          
          // Сохраняем в localStorage для кэширования
          try {
            localStorage.setItem(`followings_${userId}`, JSON.stringify(data.followings));
            localStorage.setItem(`followings_total_${userId}`, data.total.toString());
          } catch (cacheError) {
            console.warn('Ошибка при кэшировании фолловингов:', cacheError);
          }
        } else {
          setFollowings([]);
          setTotalFollowings(0);
        }
      } catch (err) {
        console.error('Ошибка при загрузке фолловингов:', err);
        setError('Не удалось загрузить данные о фолловингах. Пожалуйста, попробуйте позже.');
        
        // Пробуем загрузить данные из кэша
        try {
          const cachedFollowingsStr = localStorage.getItem(`followings_${userId}`);
          const cachedTotalStr = localStorage.getItem(`followings_total_${userId}`);
          
          if (cachedFollowingsStr) {
            const cachedFollowings = JSON.parse(cachedFollowingsStr);
            if (Array.isArray(cachedFollowings) && cachedFollowings.length > 0) {
              console.log('Загружаем фолловинги из кэша:', cachedFollowings.length);
              setFollowings(cachedFollowings);
              setTotalFollowings(parseInt(cachedTotalStr || '0', 10) || cachedFollowings.length);
              setError('Данные загружены из кэша и могут быть устаревшими');
            }
          }
        } catch (cacheError) {
          console.error('Ошибка при получении фолловингов из кэша:', cacheError);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchFollowings();
  }, [isAuthenticated, userId]);
  
  const retryFetchFollowings = () => {
    setLoading(true);
    setError(null);
    window.location.reload();
  };
  
  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Фолловинги | Streamers Universe</title>
        </Head>
        <div className={styles.authMessage}>
          <h2>Требуется авторизация</h2>
          <p>Пожалуйста, войдите в систему, чтобы просмотреть ваши фолловинги.</p>
          <button onClick={() => router.push('/auth')} className={styles.authButton}>
            Войти
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className={styles.container}>
      <Head>
        <title>Фолловинги | Streamers Universe</title>
        <meta name="description" content="Список пользователей, на которых вы подписаны в Twitch" />
      </Head>
      
      <div className={styles.header}>
        <h1>Ваши фолловинги Twitch</h1>
        <p className={styles.totalCount}>Всего подписок: {totalFollowings}</p>
        <Link href="/menu" className={styles.backButton}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
          Меню
        </Link>
      </div>
      
      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Загрузка фолловингов...</p>
        </div>
      ) : error ? (
        <div className={styles.errorContainer}>
          <p>{error}</p>
          <button onClick={retryFetchFollowings} className={styles.retryButton}>
            Повторить
          </button>
        </div>
      ) : followings.length === 0 ? (
        <div className={styles.emptyState}>
          <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
            <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
          <p>У вас пока нет фолловингов на Twitch</p>
          <a 
            href={`https://twitch.tv/${userLogin}`} 
            target="_blank" 
            rel="noopener noreferrer" 
            className={styles.twitchButton}
          >
            Перейти на Twitch
          </a>
        </div>
      ) : (
        <div className={styles.followersGrid}>
          {followings.map(following => (
            <div key={following.id || following.to_id} className={styles.followerCard}>
              <div className={styles.followerAvatar}>
                <Image 
                  src={following.profileImageUrl || following.user?.profile_image_url || '/images/default-avatar.png'} 
                  alt={following.name || following.user?.display_name || 'Пользователь'}
                  width={80}
                  height={80}
                  className={styles.avatarImage}
                />
              </div>
              <div className={styles.followerInfo}>
                <h3 className={styles.followerName}>{following.name || following.user?.display_name || 'Пользователь'}</h3>
                <p className={styles.followerLogin}>@{following.login || following.user?.login || 'unknown'}</p>
                <p className={styles.followDate}>
                  Подписаны с {new Date(following.followedAt || following.followed_at).toLocaleDateString('ru-RU')}
                </p>
              </div>
              <div className={styles.followerActions}>
                <Link 
                  href={`/user/${following.login || following.user?.login || ''}`} 
                  className={styles.viewProfileButton}
                >
                  Профиль в SU
                </Link>
                <a 
                  href={`https://twitch.tv/${following.login || following.user?.login || ''}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={styles.twitchProfileButton}
                >
                  Профиль на Twitch
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 