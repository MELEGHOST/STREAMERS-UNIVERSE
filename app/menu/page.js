'use client';

import styles from './menu.module.css';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { FaUser, FaUsers, FaUserFriends, FaCog, FaSearch, FaPen } from 'react-icons/fa';

export default function MenuPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const menuItems = [
    { label: t('menu.profile', { defaultValue: 'Профиль' }), icon: FaUser, href: '/profile', color: '142, 249, 252' },
    { label: t('menu.followers', { defaultValue: 'Подписчики' }), icon: FaUsers, href: '/followers', color: '142, 252, 157' },
    { label: t('menu.followings', { defaultValue: 'Подписки' }), icon: FaUserFriends, href: '/followings', color: '215, 252, 142' },
    { label: t('menu.settings', { defaultValue: 'Настройки' }), icon: FaCog, href: '/settings', color: '252, 142, 142' },
    { label: t('menu.search', { defaultValue: 'Поиск' }), icon: FaSearch, href: '/search', color: '204, 142, 252' },
    { label: t('menu.createReview', { defaultValue: 'Создать отзыв' }), icon: FaPen, href: '/reviews/create', color: '142, 202, 252' },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.logoContainer}>
        <img src="/images/logo-main.png" alt="Streamers Universe" />
      </div>
      <div className={styles.mobileMenu}>
        {menuItems.map((item, index) => (
          <div
            key={index}
            className={styles.mobileCard}
            style={{ '--card-color': `rgb(${item.color})` }}
            onClick={() => router.push(item.href)}
          >
            <item.icon size={50} color={`rgb(${item.color})`} />
            <h4>{item.label}</h4>
          </div>
        ))}
      </div>
    </div>
  );
}