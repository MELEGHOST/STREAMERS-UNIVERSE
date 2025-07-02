'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import styles from './menu.module.css';
import pageStyles from '../../styles/page.module.css';
import { FaSearch, FaCog, FaShieldAlt, FaCommentDots, FaUserCheck, FaUsers } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import MenuCard from '../components/MenuCard/MenuCard';

export default function MenuPage() {
  const { user, userRole } = useAuth();
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);

  // С этого момента мы уверены, что user существует, т.к. сюда пускает только callback.
  const userTwitchProviderId = user?.user_metadata?.provider_id;

  // --- Формирование пунктов меню --- 
  const menuItems = [
    { href: '/search', label: t('menu.search'), description: t('menu.searchDesc'), icon: <FaSearch /> },
    { href: '/reviews/create', label: t('menu.reviews'), description: t('menu.reviewsDesc'), icon: <FaCommentDots /> },
    { href: '/followings', label: t('menu.followings'), description: t('menu.followingsDesc'), icon: <FaUserCheck /> },
    { href: '/followers', label: t('menu.followers'), description: t('menu.followersDesc'), icon: <FaUsers /> },
    { href: '/settings', label: t('menu.settings'), description: t('menu.settingsDesc'), icon: <FaCog /> },
  ];

  // Добавляем админскую панель, если роль admin
  if (userRole === 'admin') {
      menuItems.push({ href: '/admin/reviews', label: t('menu.moderation'), description: t('menu.moderationDesc'), icon: <FaShieldAlt />, isAdmin: true });
  }

  const getGridTemplateColumns = () => {
    return menuItems.map((_, i) => (i === activeIndex ? '10fr' : '1fr')).join(' ');
  };

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
          <ul 
            className={styles.cardList}
            style={{ gridTemplateColumns: getGridTemplateColumns() }}
            onMouseLeave={() => setActiveIndex(null)}
          >
            {menuItems.map((item, index) => (
              <li key={item.href} onMouseMove={() => setActiveIndex(index)}>
                <MenuCard 
                  href={item.href} 
                  label={item.label}
                  icon={item.icon}
                  description={item.description}
                  isActive={index === activeIndex}
                />
              </li>
            ))}
          </ul>
      </main>

      <footer className={pageStyles.footer}>
          <p>{t('footerRights', { year: new Date().getFullYear() })}</p>
      </footer>
    </div>
  );
}
