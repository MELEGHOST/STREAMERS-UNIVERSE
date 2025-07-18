'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import styles from './menu.module.css';
import pageStyles from '../../styles/page.module.css';
import { useTranslation } from 'react-i18next';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/effect-cube';
import { EffectCube } from 'swiper/modules';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

const ICONS = {
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  reviews: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12l4 6-10 13L2 9Z" />
      <path d="M11 3 8 9l4 13 4-13-3-6" />
      <path d="M2 9h20" />
    </svg>
  ),
  followings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M7 3v18" /><path d="M3 7.5h4" /><path d="M3 12h18" /><path d="M3 16.5h4" /><path d="M17 3v18" /><path d="M17 7.5h4" /><path d="M17 16.5h4" />
    </svg>
  ),
  followers: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 17V5a2 2 0 0 0-2-2H4" />
        <path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/>
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
  const router = useRouter();

  const menuItems = [
    { href: '/profile', label: t('menu.profile'), name: 'profile', description: t('menu.profileDesc') },
    { href: '/edit-profile', label: t('menu.editProfile'), name: 'editProfile', description: t('menu.editProfileDesc') },
    { href: '/followers', label: t('menu.followers'), name: 'followers', description: t('menu.followersDesc') },
    { href: '/followings', label: t('menu.followings'), name: 'followings', description: t('menu.followingsDesc') },
    { href: '/my-reviews', label: t('menu.myReviews'), name: 'myReviews', description: t('menu.myReviewsDesc') },
    { href: '/achievements', label: t('menu.achievements'), name: 'achievements', description: t('menu.achievementsDesc') },
    { href: '/settings', label: t('menu.settings'), name: 'settings', description: t('menu.settingsDesc') },
    { href: '/admin', label: t('menu.admin'), name: 'admin', description: t('menu.adminDesc'), condition: userRole === 'admin' },
  ];

  return (
    <div className={pageStyles.container}>
      <header className={styles.header}>
          <div className={styles.logoContainer}>
              <Link href="/menu" passHref className={styles.logoImageLink}>
                <Image src="/logo.png" alt={t('logoAlt')} width={80} height={80} priority /> 
              </Link>
              <span className={styles.logoText}>{t('appName')}</span>
          </div>
          
          <nav className={styles.userNav}>
              {user?.user_metadata?.provider_id && (
                  <Link href={`/profile/${user.user_metadata.provider_id}`} className={styles.userLink} title={t('menu.profile')}>
                      <Image 
                          src={user?.user_metadata?.avatar_url || '/default_avatar.png'}
                          alt={t('yourAvatar')}
                          width={72} 
                          height={72} 
                          className={styles.userAvatar}
                          unoptimized
                      />
                      <span className={styles.userName}>{user?.user_metadata?.name || user?.user_metadata?.user_name || t('menu.profile')}</span>
                  </Link>
              )}
          </nav>
      </header>

      <main className={styles.mainContent}>
          <h2 className={styles.mainTitle}>{t('menu.navigationMenu')}</h2>
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
          >
            {menuItems.map((item) => (
              <SwiperSlide key={item.href}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, rotateY: 90 }}
                  animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                  transition={{ duration: 0.5 }}
                  className={styles.menuItem}
                  onClick={() => router.push(item.href)}
                >
                  <Image src={ICONS[item.name] ? ICONS[item.name].props.viewBox : '/icons/default.png'} alt={item.label} width={100} height={100} className={styles.icon} />
                  <h2>{item.label}</h2>
                </motion.div>
              </SwiperSlide>
            ))}
          </Swiper>
      </main>

      <footer className={pageStyles.footer}>
          <p>{t('footerRights', { year: new Date().getFullYear() })}</p>
      </footer>
    </div>
  );
}
