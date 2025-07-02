'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import styles from './menu.module.css';
import pageStyles from '../../styles/page.module.css';
import { FaSearch, FaCog, FaShieldAlt, FaCommentDots, FaUserCheck, FaUsers, FaPen, FaTrophy, FaSignOutAlt } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

export default function MenuPage() {
  const { user, userRole, signOut } = useAuth();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await signOut();
  };

  // С этого момента мы уверены, что user существует, т.к. сюда пускает только callback.
  const userTwitchProviderId = user?.user_metadata?.provider_id;

  // --- Формирование пунктов меню --- 
  const menuItems = [
    { href: '/search', label: t('menu.search'), icon: <FaSearch /> },
    { href: '/my-reviews', label: t('menu.myReviews'), icon: <FaCommentDots /> },
    { href: '/edit-profile', label: t('menu.editProfile'), icon: <FaPen /> },
    { href: '/achievements', label: t('menu.achievements'), icon: <FaTrophy /> },
    { href: '/followings', label: t('menu.followings'), icon: <FaUserCheck /> },
    { href: '/followers', label: t('menu.followers'), icon: <FaUsers /> },
    { href: '/settings', label: t('menu.settings'), icon: <FaCog /> },
  ];

  // Добавляем админскую панель, если роль admin
  if (userRole === 'admin') {
      menuItems.push({ href: '/admin/reviews', label: t('menu.moderation'), icon: <FaShieldAlt />, isSpecial: true });
  }

  // Добавляем кнопку выхода последней
  const allItems = [
    ...menuItems,
    { action: handleLogout, label: t('logout'), icon: <FaSignOutAlt />, isSpecial: true, isLogout: true }
  ];

  return (
    <div className={pageStyles.container}>
      <header className={styles.header}>
          {/* Контейнер для лого и текста */}
          <div className={styles.logoContainer}>
              {/* Ссылка только на картинке */}
              <Link href="/menu" passHref className={styles.logoImageLink}>
                <Image src="/logo.png" alt={t('logoAlt')} width={40} height={40} priority /> 
              </Link>
              {/* Текст без ссылки */}
              <span className={styles.logoText}>{t('appName')}</span>
          </div>
          
          {/* Навигация пользователя */} 
          <nav className={styles.userNav}>
              {userTwitchProviderId && (
                  <Link href={`/profile/${userTwitchProviderId}`} className={styles.userLink} title={t('menu.profile')}>
                      <Image 
                          src={user?.user_metadata?.avatar_url || '/default_avatar.png'} // TODO: Заменить fallback
                          alt={t('yourAvatar')}
                          width={36} 
                          height={36} 
                          className={styles.userAvatar}
                          unoptimized // Убрать, если next/image настроен
                      />
                      <span className={styles.userName}>{user?.user_metadata?.name || user?.user_metadata?.user_name || t('menu.profile')}</span>
                  </Link>
              )}
          </nav>
      </header>

      <main className={styles.mainContent}>
          <h1 className={styles.mainTitle}>{t('menu.navigationMenu')}</h1>
          <nav className={styles.mainNavGrid}>
              {allItems.map((item, index) => (
                  item.href ? (
                      <Link
                          key={item.href}
                          href={item.href}
                          className={`${styles.navCard} ${item.isSpecial ? styles.adminCard : ''}`}
                      >
                          <div className={styles.navCardIcon}>{item.icon}</div>
                          <span className={styles.navCardLabel}>{item.label}</span>
                      </Link>
                  ) : (
                      <button
                          key="logout"
                          onClick={item.action}
                          className={`${styles.navCard} ${styles.adminCard}`}
                      >
                          <div className={styles.navCardIcon}>{item.icon}</div>
                          <span className={styles.navCardLabel}>{item.label}</span>
                      </button>
                  )
              ))}
          </nav>
      </main>

      <footer className={pageStyles.footer}>
          <p>{t('footerRights', { year: new Date().getFullYear() })}</p>
      </footer>
    </div>
  );
}
