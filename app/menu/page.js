'use client';

import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import styles from './menu.module.css';
import { useTranslation } from 'react-i18next';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/effect-cube';
import { EffectCube } from 'swiper/modules';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function MenuPage() {
  const { userRole } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  const iconPaths = {
    profile: '/icons/profile.png',
    editProfile: '/icons/edit.png',
    followers: '/icons/followers.png',
    followings: '/icons/followings.png',
    myReviews: '/icons/reviews.png',
    achievements: '/icons/achievements.png',
    settings: '/icons/settings.png',
    admin: '/icons/admin.png',
  };

  const menuItems = [
    { href: '/profile', label: t('menu.profile'), name: 'profile' },
    { href: '/edit-profile', label: t('menu.editProfile'), name: 'editProfile' },
    { href: '/followers', label: t('menu.followers'), name: 'followers' },
    { href: '/followings', label: t('menu.followings'), name: 'followings' },
    { href: '/my-reviews', label: t('menu.myReviews'), name: 'myReviews' },
    { href: '/achievements', label: t('menu.achievements'), name: 'achievements' },
    { href: '/settings', label: t('menu.settings'), name: 'settings' },
    { href: '/admin', label: t('menu.admin'), name: 'admin', condition: userRole === 'admin' },
  ];

  const filteredItems = menuItems.filter(item => !item.condition || item.condition);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>{t('menu_page.title')}</h1>
      </header>
      <Swiper
        modules={[EffectCube]}
        effect="cube"
        grabCursor={true}
        cubeEffect={{
          shadow: true,
          slideShadows: true,
          shadowOffset: 20,
          shadowScale: 0.94,
        }}
        className={styles.swiper}
        style={{ minHeight: '400px' }}
      >
        {filteredItems.map((item) => (
          <SwiperSlide key={item.href}>
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotateY: 90 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ duration: 0.5 }}
              className={styles.menuItem}
              onClick={() => router.push(item.href)}
            >
              <Image src={iconPaths[item.name] || '/icons/default.png'} alt={item.label} width={100} height={100} className={styles.icon} />
              <h2>{item.label}</h2>
            </motion.div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
