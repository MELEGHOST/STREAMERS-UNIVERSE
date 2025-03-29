'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../profile.module.css';
import { useAuth } from '../../../contexts/AuthContext';
import CyberAvatar from '../../components/CyberAvatar';
import SynthwaveButton from '../../components/SynthwaveButton';
import Cookies from 'js-cookie';
import Image from 'next/image';

export default function UserProfile({ params }) {
  const { id } = params;
  const router = useRouter();
  const { isAuthenticated, userId } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFollowed, setIsFollowed] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [showFollowers, setShowFollowers] = useState(false);
  const [followings, setFollowings] = useState([]);
  const [showFollowings, setShowFollowings] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }

    // Проверяем, не пытается ли пользователь открыть свой профиль
    if (id === userId) {
      router.push('/profile');
      return;
    }

    const fetchUserData = async () => {
      setLoading(true);
      try {
        // Получаем данные пользователя
        const response = await fetch(`/api/twitch/user?userId=${id}`, {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Ошибка при получении данных пользователя: ${response.status}`);
        }

        const data = await response.json();
        setUserData(data);

        // Проверяем статус подписки
        const isFollowing = Cookies.get(`follow_${userId}_${id}`);
        setIsFollowed(!!isFollowing);

        // Загружаем фолловеров
        fetchFollowers();
        
        // Загружаем фолловингов
        fetchFollowings();
      } catch (error) {
        console.error('Ошибка при загрузке данных пользователя:', error);
        setError(error.message || 'Произошла ошибка при загрузке данных');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [id, userId, isAuthenticated, router]);

  const fetchFollowers = async () => {
    try {
      const response = await fetch(`/api/twitch/user-followers?userId=${id}`);
      if (response.ok) {
        const data = await response.json();
        setFollowers(data.followers || []);
      } else {
        console.error('Ошибка при загрузке фолловеров:', response.status);
      }
    } catch (error) {
      console.error('Ошибка при загрузке фолловеров:', error);
    }
  };

  const fetchFollowings = async () => {
    try {
      const response = await fetch(`/api/twitch/user-followings?userId=${id}`);
      if (response.ok) {
        const data = await response.json();
        setFollowings(data.followings || []);
      } else {
        console.error('Ошибка при загрузке фолловингов:', response.status);
      }
    } catch (error) {
      console.error('Ошибка при загрузке фолловингов:', error);
    }
  };

  const handleFollow = async () => {
    try {
      setLoading(true);
      // Отправляем запрос на API для подписки/отписки
      const response = await fetch(`/api/twitch/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          targetUserId: id,
          action: isFollowed ? 'unfollow' : 'follow'
        }),
      });

      if (!response.ok) {
        throw new Error(`Ошибка: ${response.status}`);
      }

      const data = await response.json();
      
      // Обновляем состояние
      setIsFollowed(!isFollowed);

      alert(data.success ? 
        (isFollowed ? 'Вы успешно отписались' : 'Вы успешно подписались') : 
        'Произошла ошибка. Попробуйте позже.');
    } catch (error) {
      console.error('Ошибка при подписке/отписке:', error);
      alert('Произошла ошибка при обновлении подписки. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const toggleFollowers = () => {
    setShowFollowers(!showFollowers);
  };

  const toggleFollowings = () => {
    setShowFollowings(!showFollowings);
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
        <h2>Ошибка</h2>
        <p>{error}</p>
        <button 
          className={styles.button}
          onClick={() => router.push('/menu')}
        >
          Вернуться в меню
        </button>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className={styles.error}>
        <h2>Пользователь не найден</h2>
        <button 
          className={styles.button}
          onClick={() => router.push('/menu')}
        >
          Вернуться в меню
        </button>
      </div>
    );
  }

  return (
    <div className={styles.profileContainer}>
      <div className={styles.profileHeader}>
        <div className={styles.avatarContainer}>
          <CyberAvatar 
            imageUrl={userData.profile_image_url || '/default-avatar.png'} 
            alt={userData.display_name}
            size={150}
          />
        </div>
        <div className={styles.profileInfo}>
          <h1>{userData.display_name || userData.login}</h1>
          <div className={styles.statusContainer}>
            <span className={styles.statusText}>Статус:</span>
            <span className={styles.statusValue}>
              {userData.broadcaster_type === 'partner' ? 'Партнер' : 
               userData.broadcaster_type === 'affiliate' ? 'Аффилиат' : 
               'Зритель'}
            </span>
          </div>
          
          <div className={styles.statsContainer}>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{userData.follower_count || 0}</div>
              <div className={styles.statLabel}>Фолловеров</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{userData.following_count || 0}</div>
              <div className={styles.statLabel}>Фолловит</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{userData.view_count || 0}</div>
              <div className={styles.statLabel}>Просмотров</div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.profileActions}>
        <SynthwaveButton 
          text="ПОСЛЕДОВАТЬ"
          isActive={isFollowed}
          onClick={handleFollow}
        />
        <button 
          className={styles.button}
          onClick={() => router.push(`/streamer-schedule/${id}`)}
        >
          Расписание трансляций
        </button>
        <button 
          className={styles.button}
          onClick={toggleFollowers}
        >
          Показать фолловеров
        </button>
        <button 
          className={styles.button}
          onClick={toggleFollowings}
        >
          Показать подписки
        </button>
      </div>

      {showFollowers && (
        <div className={styles.followersSection}>
          <h2>Фолловеры ({followers.length})</h2>
          {followers.length > 0 ? (
            <div className={styles.followersGrid}>
              {followers.map(follower => (
                <div key={follower.id} className={styles.followerCard}>
                  <Image 
                    src={follower.avatar || '/images/default-avatar.png'} 
                    alt={follower.login}
                    width={50}
                    height={50}
                    className={styles.followerAvatar}
                    onClick={() => router.push(`/profile/${follower.id}`)}
                  />
                  <p>{follower.login}</p>
                </div>
              ))}
            </div>
          ) : (
            <p>У этого пользователя нет фолловеров.</p>
          )}
        </div>
      )}

      {showFollowings && (
        <div className={styles.followingsSection}>
          <h2>Подписки ({followings.length})</h2>
          {followings.length > 0 ? (
            <div className={styles.followingsGrid}>
              {followings.map(following => (
                <div key={following.id} className={styles.followingCard}>
                  <Image 
                    src={following.avatar || '/images/default-avatar.png'}
                    alt={following.login}
                    width={50}
                    height={50}
                    className={styles.followingAvatar}
                    onClick={() => router.push(`/profile/${following.id}`)}
                  />
                  <p>{following.login}</p>
                </div>
              ))}
            </div>
          ) : (
            <p>Этот пользователь ни на кого не подписан.</p>
          )}
        </div>
      )}

      <button 
        className={styles.backToProfileButton}
        onClick={() => router.push('/menu')}
      >
        Вернуться в меню
      </button>
    </div>
  );
} 