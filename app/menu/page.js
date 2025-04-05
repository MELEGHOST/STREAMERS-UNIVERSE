'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from '../../styles/menu.module.css';
import { useAuth } from '../contexts/AuthContext';

export default function Menu() {
  const router = useRouter();
  const { user, supabase, isLoading, isAuthenticated } = useAuth();
  
  const [error, setError] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('[MenuPage] Пользователь не аутентифицирован, перенаправление на /auth');
      router.push('/auth?message=Session expired or not found');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut || !supabase) return;
    setIsLoggingOut(true);
    console.log('Меню: Выполняем выход из аккаунта через Supabase...');
    setError(null); 
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error('Меню: Ошибка при выходе из Supabase:', signOutError);
        setError(`Ошибка при выходе: ${signOutError.message}`);
        setIsLoggingOut(false);
      } else {
        console.log('Меню: Выход из Supabase успешен. AuthContext должен обработать редирект.');
      }
    } catch (criticalError) {
      console.error('Меню: Критическая ошибка при выходе из аккаунта:', criticalError);
      setError('Произошла критическая ошибка при выходе из аккаунта.');
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, supabase, setError, router]);

  const userDisplayName = user?.user_metadata?.full_name || user?.email || 'Пользователь';
  const userAvatarUrl = user?.user_metadata?.avatar_url || '/images/default_avatar.png';

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}> 
        <div className={styles.spinner}></div>
        <p>Загрузка меню...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
     return (
      <div className={styles.loadingContainer}>
        <p>Перенаправление на страницу входа...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.menuHeader}>
        <div className={styles.userInfo} onClick={() => router.push('/profile')} title="Перейти в профиль">
          <div className={styles.userAvatar}>
            <Image 
              src={userAvatarUrl}
              alt="Аватар пользователя" 
              width={60} 
              height={60} 
              onError={(e) => { e.target.src = '/images/default_avatar.png'; }} 
              priority 
            />
          </div>
          <div className={styles.userDetails}>
            <h1>{userDisplayName}</h1>
          </div>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>} 

      <nav className={styles.navigation}>
        <ul>
          <li className={styles.menuItem} onClick={() => router.push('/profile')}>
             <span className={styles.menuIcon}>👤</span>
             <div className={styles.menuContent}>
                <h2>Профиль</h2>
                <p>Просмотр и редактирование вашего профиля</p>
             </div>
          </li>
           <li className={styles.menuItem} onClick={() => router.push('/search')}>
             <span className={styles.menuIcon}>🔍</span>
             <div className={styles.menuContent}>
                <h2>Поиск</h2>
                <p>Найти стримеров и контент</p>
             </div>
          </li>
        </ul>
      </nav>

      <button 
        onClick={handleLogout}
        className={`${styles.logoutButton}`}
        disabled={isLoggingOut}
      >
        {isLoggingOut ? 'Выход...' : 'Выйти из аккаунта'}
      </button>
    </div>
  );
} 