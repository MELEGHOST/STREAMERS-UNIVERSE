'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import styles from './menu.module.css';

export default function MenuPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, supabase } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('[MenuPage] Пользователь не аутентифицирован, перенаправляем на главную');
      router.replace('/?next=/menu');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleLogout = async () => {
    if (!supabase) return;
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error('[MenuPage] Ошибка выхода:', signOutError);
      } else {
        console.log('[MenuPage] Выход успешен. Редирект будет обработан AuthContext.');
      }
    } catch (criticalError) {
      console.error('[MenuPage] Критическая ошибка выхода:', criticalError);
    }
  };

  const userTwitchId = user?.user_metadata?.provider_id;
  const userRole = user?.profile?.role;

  if (isLoading) {
    return <div className={styles.loadingContainer}><div className="spinner"></div></div>;
  }

  if (!isAuthenticated && !isLoading) {
     return <div className={styles.loadingContainer}><p>Перенаправление...</p></div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" passHref>
          <Image src="/logo.png" alt="Streamers Universe Logo" width={50} height={50} priority />
        </Link>
        
        <nav className={styles.userNav}>
           {userTwitchId && (
             <Link href={`/profile/${userTwitchId}`} className={styles.userLink} title="Перейти в профиль">
                <Image 
                   src={user?.user_metadata?.avatar_url || '/images/default_avatar.png'} 
                   alt="Ваш аватар"
                   width={40} 
                   height={40} 
                   className={styles.userAvatar}
                />
                <span className={styles.userName}>{user?.user_metadata?.full_name || 'Профиль'}</span>
             </Link>
            )}
            <button onClick={handleLogout} className={styles.logoutButton} title="Выйти">🚪</button> 
         </nav>
      </header>

      <main className={styles.mainContent}>
        <h2 className={styles.mainTitle}>Меню навигации</h2>
        <nav className={styles.mainNav}>
           <Link href="/search" className={styles.navButton}>
            <span className={styles.icon}>🔍</span> Поиск
          </Link>
          <Link href="/leaderboards" className={styles.navButton}>
            <span className={styles.icon}>🏆</span> Топы Стримеров
          </Link>
          <Link href="/streams" className={styles.navButton}>
            <span className={styles.icon}>🔴</span> Текущие Стримы
          </Link>
          <Link href="/reviews" className={styles.navButton}>
              <span className={styles.icon}>💬</span> Отзывы
          </Link>
          {isAuthenticated && (
             <Link href="/achievements" className={styles.navButton}>
               <span className={styles.icon}>🏅</span> Достижения
             </Link>
           )}
           {userRole === 'admin' && (
               <Link href="/admin/reviews" className={`${styles.navButton} ${styles.adminButton}`}> 
                  <span className={styles.icon}>🛡️</span> Модерация
               </Link>
           )}
        </nav>
      </main>

      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} Streamers Universe. Все права защищены?</p>
      </footer>
    </div>
  );
} 