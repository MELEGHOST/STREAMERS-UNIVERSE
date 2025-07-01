'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import styles from './menu.module.css';
import pageStyles from '../../styles/page.module.css';
import { FaSearch, FaCog, FaShieldAlt, FaCommentDots, FaUserCheck, FaUsers } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

export default function MenuPage() {
  const { user, userRole } = useAuth();
  const { t } = useTranslation();

  // С этого момента мы уверены, что user существует, т.к. сюда пускает только callback.
  const userTwitchProviderId = user?.user_metadata?.provider_id;

  // --- Формирование пунктов меню --- 
  const menuItems = [
    { href: '/search', label: t('menu.search'), icon: <FaSearch /> },
    { href: '/reviews/create', label: t('menu.reviews'), icon: <FaCommentDots /> },
    { href: '/followings', label: t('menu.followings'), icon: <FaUserCheck /> },
    { href: '/followers', label: t('menu.followers'), icon: <FaUsers /> },
    { href: '/settings', label: t('menu.settings'), icon: <FaCog /> },
  ];

  // Добавляем админскую панель, если роль admin
  if (userRole === 'admin') {
      menuItems.push({ href: '/admin/reviews', label: t('menu.moderation'), icon: <FaShieldAlt />, isAdmin: true });
  }

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
          <h2 className={styles.mainTitle}>{t('menu.navigationMenu')}</h2>
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
          <p>{t('footerRights', { year: new Date().getFullYear() })}</p>
      </footer>
    </div>
  );
}
