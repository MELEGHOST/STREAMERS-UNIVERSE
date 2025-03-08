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
        
        // Получаем фолловингов пользователя из Twitch API
        const response = await fetch(`https://api.twitch.tv/helix/users/follows?from_id=${userId}`, {
          headers: {
            'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Не удалось загрузить данные о фолловингах');
        }
        
        const data = await response.json();
        
        // Если есть фолловинги, получаем информацию о каждом пользователе
        if (data.data && data.data.length > 0) {
          // Получаем ID всех фолловингов
          const followingIds = data.data.map(follow => follow.to_id);
          
          // Получаем информацию о пользователях
          const usersResponse = await fetch(`https://api.twitch.tv/helix/users?id=${followingIds.join('&id=')}`, {
            headers: {
              'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!usersResponse.ok) {
            throw new Error('Не удалось загрузить данные о пользователях');
          }
          
          const usersData = await usersResponse.json();
          
          // Объединяем данные о фолловингах с данными о пользователях
          const followingsWithUserData = data.data.map(follow => {
            const userData = usersData.data.find(user => user.id === follow.to_id);
            return {
              ...follow,
              user: userData
            };
          });
          
          setFollowings(followingsWithUserData);
        } else {
          setFollowings([]);
        }
      } catch (err) {
        console.error('Ошибка при загрузке фолловингов:', err);
        setError('Не удалось загрузить данные о фолловингах. Пожалуйста, попробуйте позже.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchFollowings();
  }, [isAuthenticated, userId]);
  
  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Фолловинги | Streamers Universe</title>
        </Head>
        <div className={styles.authMessage}>
          <h2>Требуется авторизация</h2>
          <p>Пожалуйста, войдите в систему, чтобы просмотреть ваши фолловинги.</p>
          <button onClick={() => router.push('/login')} className={styles.authButton}>
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
          <button onClick={() => window.location.reload()} className={styles.retryButton}>
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
            <div key={following.to_id} className={styles.followerCard}>
              <div className={styles.followerAvatar}>
                <Image 
                  src={following.user?.profile_image_url || '/images/default-avatar.png'} 
                  alt={following.user?.display_name || 'Пользователь'}
                  width={80}
                  height={80}
                  className={styles.avatarImage}
                />
              </div>
              <div className={styles.followerInfo}>
                <h3 className={styles.followerName}>{following.user?.display_name || 'Пользователь'}</h3>
                <p className={styles.followerLogin}>@{following.user?.login || 'unknown'}</p>
                <p className={styles.followDate}>
                  Подписаны с {new Date(following.followed_at).toLocaleDateString()}
                </p>
              </div>
              <div className={styles.followerActions}>
                <Link 
                  href={`/user/${following.user?.login}`} 
                  className={styles.viewProfileButton}
                >
                  Профиль в SU
                </Link>
                <a 
                  href={`https://twitch.tv/${following.user?.login}`} 
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