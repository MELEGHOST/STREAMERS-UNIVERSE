'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import styles from './menu.module.css';
import pageStyles from '../../styles/page.module.css';
import { /*FaUserFriends,*/ FaSearch, FaCog, FaShieldAlt, FaCommentDots, FaUserCheck, FaUsers } from 'react-icons/fa';

export default function MenuPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, userRole } = useAuth();

  const userTwitchProviderId = user?.user_metadata?.provider_id;

  // --- Формирование пунктов меню --- 
  const menuItems = [
    // Убираем "Главная"
    // { href: '/home', label: 'Главная', icon: <FaHome /> }, 
    { href: '/search', label: 'Поиск', icon: <FaSearch /> },
    { href: '/reviews/create', label: 'Отзывы', icon: <FaCommentDots /> },
    { href: '/followings', label: 'Вдохновители', icon: <FaUserCheck /> },
    { href: '/followers', label: 'Последователи', icon: <FaUsers /> },
    { href: '/settings', label: 'Настройки', icon: <FaCog /> },
  ];

  // Добавляем админскую панель, если роль admin
  if (userRole === 'admin') {
      menuItems.push({ href: '/admin/reviews', label: 'Модерация', icon: <FaShieldAlt />, isAdmin: true });
  }

  // --- Рендеринг --- 
  if (isLoading) {
    return (
      <div className={pageStyles.loadingContainer}>
        <div className="spinner"></div><p>Загрузка меню...</p>
      </div>
    );
  }

  // Редирект, если не авторизован (хотя middleware должен это делать)
  if (!isAuthenticated) {
      router.push('/auth?next=/menu');
      return null; 
  }

  return (
    <div className={pageStyles.container}>
      <header className={styles.header}>
          {/* Контейнер для лого и текста */}
          <div className={styles.logoContainer}>
              {/* Ссылка только на картинке */}
              <Link href="/menu" passHref className={styles.logoImageLink}>
                <Image src="/logo.png" alt="Streamers Universe Logo" width={40} height={40} priority /> 
              </Link>
              {/* Текст без ссылки */}
              <span className={styles.logoText}>Streamers Universe</span>
          </div>
          
          {/* Навигация пользователя */} 
          <nav className={styles.userNav}>
              {userTwitchProviderId && (
                  <Link href={`/profile/${userTwitchProviderId}`} className={styles.userLink} title="Перейти в профиль">
                      <Image 
                          src={user?.user_metadata?.avatar_url || '/default_avatar.png'} // TODO: Заменить fallback
                          alt="Ваш аватар"
                          width={36} 
                          height={36} 
                          className={styles.userAvatar}
                          unoptimized // Убрать, если next/image настроен
                      />
                      <span className={styles.userName}>{user?.user_metadata?.name || user?.user_metadata?.user_name || 'Профиль'}</span>
                  </Link>
              )}
              {/* Убираем кнопку выхода */}
              {/* 
              <button onClick={handleLogout} className={styles.logoutButton} title="Выйти">
                  <FaSignOutAlt />
              </button> 
              */}
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
