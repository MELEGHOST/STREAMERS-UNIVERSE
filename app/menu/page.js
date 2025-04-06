'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import styles from './menu.module.css';
import pageStyles from '../../styles/page.module.css';
import { FaUser, FaUsers, FaCog, FaPlusCircle, FaSignOutAlt, FaSearch, FaCommentDots } from 'react-icons/fa';

export default function MenuPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, supabase, signOut } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('[MenuPage] Пользователь не аутентифицирован, перенаправляем на главную');
      router.replace('/?next=/menu');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleLogout = async () => {
    if (signOut) {
        await signOut();
    } else if (supabase) { 
        try {
            const { error: signOutError } = await supabase.auth.signOut();
            if (signOutError) console.error('[MenuPage] Ошибка выхода:', signOutError);
            else console.log('[MenuPage] Выход успешен (через supabase.auth). Редирект будет обработан AuthContext.');
        } catch (criticalError) {
            console.error('[MenuPage] Критическая ошибка выхода:', criticalError);
        }
    } else {
        console.error("[MenuPage] Не удалось выполнить выход: клиент Supabase недоступен.");
    }
  };

  const userTwitchProviderId = user?.user_metadata?.provider_id;

  const menuItems = [
    { href: '/search', label: 'Поиск', icon: <FaSearch /> },
    { href: '/reviews', label: 'Отзывы', icon: <FaCommentDots /> },
    { href: '/followers', label: 'Последователи', icon: <FaUsers />, requiresAuth: true },
    { href: '/following', label: 'Вдохновители', icon: <FaUsers style={{ transform: 'scaleX(-1)' }}/>, requiresAuth: true },
    { href: '/settings', label: 'Настройки', icon: <FaCog />, requiresAuth: true },
  ];

  if (isLoading) {
    return <div className={pageStyles.loadingContainer}><div className="spinner"></div></div>;
  }

  if (!isAuthenticated && !isLoading) {
     return <div className={pageStyles.loadingContainer}><p>Перенаправление...</p></div>;
  }

  return (
    <div className={pageStyles.container}>
      <header className={styles.header}>
         <Link href="/menu" passHref className={styles.logoLink}>
            <Image src="/Logo.png" alt="Streamers Universe Logo" width={40} height={40} priority /> 
            <span className={styles.logoText}>Streamers Universe</span>
         </Link>

         <nav className={styles.userNav}>
             {userTwitchProviderId && (
                 <Link href={`/profile/${userTwitchProviderId}`} className={styles.userLink} title="Перейти в профиль">
                     <Image 
                        src={user?.user_metadata?.avatar_url || '/default_avatar.png'}
                        alt="Ваш аватар"
                        width={36} 
                        height={36} 
                        className={styles.userAvatar}
                     />
                     <span className={styles.userName}>{user?.user_metadata?.name || user?.user_metadata?.user_name || 'Профиль'}</span>
                 </Link>
             )}
             <button onClick={handleLogout} className={styles.logoutButton} title="Выйти">
                 <FaSignOutAlt />
             </button> 
         </nav>
      </header>

      <main className={styles.mainContent}>
        <h2 className={styles.mainTitle}>Меню навигации</h2>
         <nav className={styles.mainNavGrid}>
             {menuItems.map((item) => (
                 <Link 
                    key={item.href}
                    href={item.href} 
                    className={`${styles.navCard} ${item.isAdmin ? styles.adminCard : ''}`}
                  >
                     <div className={styles.navCardIcon}>{item.icon}</div>
                     <span className={styles.navCardLabel}>{item.label}</span>
                 </Link>
             ))}
         </nav>
      </main>

      <footer className={pageStyles.footer}>
        <p>&copy; {new Date().getFullYear()} Streamers Universe. Все права защищены?</p>
      </footer>
    </div>
  );
} 