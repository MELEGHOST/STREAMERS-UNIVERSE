'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../profile.module.css';
import { createBrowserClient } from '@supabase/ssr';
import CyberAvatar from '../../components/CyberAvatar';

export default function UserProfile({ params }) {
  const { id: targetUserId } = params;
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const supabase = useMemo(() => 
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ), 
  []);

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      setLoading(true);
      setError(null);
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        router.push('/auth?reason=unauthenticated');
        return;
      }

      if (targetUserId === session.user.id) {
        router.push('/profile');
        return;
      }

      try {
        console.log(`Загрузка данных для профиля ID: ${targetUserId}`);
        const targetUserDataFromApi = {
            id: targetUserId,
            display_name: `Пользователь ${targetUserId.substring(0, 6)}`, 
            login: `user_${targetUserId.substring(0, 6)}`,
            profile_image_url: '/default-avatar.png',
            description: 'Описание пользователя...',
            broadcaster_type: null
        };
        
        await new Promise(resolve => setTimeout(resolve, 500)); 
        if (!targetUserDataFromApi) {
             throw new Error(`Пользователь с ID ${targetUserId} не найден.`);
        }
        setUserData(targetUserDataFromApi);

      } catch (fetchError) {
        console.error('Ошибка при загрузке данных пользователя:', fetchError);
        setError(fetchError.message || 'Произошла ошибка при загрузке данных');
        setUserData(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndLoad();
  }, [targetUserId, supabase, router]);

  const handleProposeReview = () => {
      if (!userData) return;
      
      const uploadUrl = new URL('/reviews/upload', window.location.origin);
      uploadUrl.searchParams.set('targetUserId', userData.id);
      uploadUrl.searchParams.set('targetUserName', userData.display_name || userData.login);
      
      router.push(uploadUrl.toString());
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

  const profileDisplayName = userData.display_name || userData.login || 'Неизвестный пользователь';
  const profileAvatarUrl = userData.profile_image_url || '/default-avatar.png';
  const profileStatus = userData.broadcaster_type === 'partner' ? 'Партнер' : 
                        userData.broadcaster_type === 'affiliate' ? 'Аффилиат' : 'Зритель';

  return (
    <div className={styles.profileContainer}>
      <div className={styles.profileHeader}>
        <div className={styles.avatarContainer}>
          <CyberAvatar 
            imageUrl={profileAvatarUrl}
            alt={profileDisplayName}
            size={150}
          />
        </div>
        <div className={styles.profileInfo}>
          <h1>{profileDisplayName}</h1>
          <div className={styles.statusContainer}>
            <span className={styles.statusText}>Статус:</span>
            <span className={styles.statusValue}>{profileStatus}</span>
          </div>
          <div className={styles.actionButtons}>
              <button 
                  className={`${styles.button} ${styles.proposeReviewButton}`}
                  onClick={handleProposeReview}
                  title={`Предложить отзыв для ${profileDisplayName}`}
              >
                 💾 Предложить отзыв
              </button>
          </div>
        </div>
      </div>

      {userData.description && (
            <div className={styles.profileDescription}>
                <h3>Описание</h3>
                <p>{userData.description}</p>
            </div>
       )}
    </div>
  );
} 