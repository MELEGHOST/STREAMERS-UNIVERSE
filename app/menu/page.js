'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import styles from './menu.module.css';
import pageStyles from '../../styles/page.module.css';
import { useTranslation } from 'react-i18next';
import MenuCard from '../components/MenuCard/MenuCard';

const ICONS = {
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  reviews: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  ),
  followings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12l4 6-10 13L2 9Z" />
      <path d="M11 3 8 9l4 13 4-13-3-6" />
      <path d="M2 9h20" />
    </svg>
  ),
  followers: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M7 3v18" /><path d="M3 7.5h4" /><path d="M3 12h18" /><path d="M3 16.5h4" /><path d="M17 3v18" /><path d="M17 7.5h4" /><path d="M17 16.5h4" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72" />
      <path d="m14 7 3 3" /><path d="M5 6v4" /><path d="M19 14v4" /><path d="M10 2v2" /><path d="M7 8H3" /><path d="M21 16h-4" /><path d="M11 3H9" />
    </svg>
  ),
  moderation: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 22h14" /><path d="M5 2h14" />
      <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
      <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
    </svg>
  ),
};

export default function MenuPage() {
  const { user, userRole } = useAuth();
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);

  // С этого момента мы уверены, что user существует, т.к. сюда пускает только callback.
  const userTwitchProviderId = user?.user_metadata?.provider_id;

  // --- Формирование пунктов меню --- 
  const menuItems = [
    { name: 'search', href: '/search', label: t('menu.search'), description: t('menu.searchDesc') },
    { name: 'reviews', href: '/reviews/create', label: t('menu.reviews'), description: t('menu.reviewsDesc') },
    { name: 'followings', href: '/followings', label: t('menu.followings'), description: t('menu.followingsDesc') },
    { name: 'followers', href: '/followers', label: t('menu.followers'), description: t('menu.followersDesc') },
    { name: 'settings', href: '/settings', label: t('menu.settings'), description: t('menu.settingsDesc') },
  ];

  // Добавляем админскую панель, если роль admin
  if (userRole === 'admin') {
      menuItems.push({ name: 'moderation', href: '/admin/reviews', label: t('menu.moderation'), description: t('menu.moderationDesc') });
  }

  const setIndex = (event) => {
    const li = event.target.closest('li');
    if (li) {
      const index = parseInt(li.dataset.index, 10);
      setActiveIndex(index);
    }
  };

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
                <Image src="/logo.png" alt={t('logoAlt')} width={80} height={80} priority /> 
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
                          width={72} 
                          height={72} 
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
            onPointerMove={setIndex}
            onFocus={setIndex}
            onClick={setIndex}
            onMouseLeave={() => setActiveIndex(null)}
          >
            {menuItems.map((item, index) => (
                <li key={item.href} data-index={index}>
                    <MenuCard 
                        href={item.href} 
                        label={item.label}
                        icon={ICONS[item.name]}
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
