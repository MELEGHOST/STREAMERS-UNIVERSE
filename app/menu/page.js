'use client';

import Image from 'next/image';
import styles from './menu.module.css';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function MenuPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const menuItems = [
    { href: '/search', label: t('menu.search', { defaultValue: 'Поиск' }), icon: '/icons/search.png' },
    { href: '/reviews/create', label: t('menu.createReview', { defaultValue: 'Создать отзыв' }), icon: '/icons/review.png' },
    // Добавь другие базовые, если нужно
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>{t('menu_page.title', { defaultValue: 'Меню навигации' })}</h1>
      </header>
      <div className={styles.cardGrid}>
        {menuItems.map((item) => (
          <motion.div
            key={item.href}
            className={styles.holoCard}
            whileHover={{ scale: 1.05, rotateY: 10, boxShadow: '0 0 30px rgba(0, 255, 255, 0.8)' }}
            transition={{ duration: 0.3 }}
            onClick={() => router.push(item.href)}
          >
            <Image src={item.icon} alt={item.label} width={100} height={100} />
            <h2>{item.label}</h2>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
