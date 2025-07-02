'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import LoginButton from '../LoginButton/LoginButton';
import styles from './Header.module.css';

const NavLink = ({ href, children }) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link href={href} className={`${styles.navLink} ${isActive ? styles.active : ''}`}>
      {children}
    </Link>
  );
};

const Header = () => {
  const { t } = useTranslation('common');

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Link href="/" className={styles.logoContainer}>
          <Image src="/logo.png" alt="Streamers Universe Logo" width={40} height={40} className={styles.logo} />
          <span className={styles.logoText}>Streamers Universe</span>
        </Link>
      </div>
      <nav className={styles.navigation}>
        <NavLink href="/search">{t('menu.search')}</NavLink>
        <NavLink href="/my-reviews">{t('menu.myReviews')}</NavLink>
        <NavLink href="/achievements">{t('menu.achievements')}</NavLink>
      </nav>
      <div className={styles.right}>
        <LoginButton />
      </div>
    </header>
  );
};

export default Header; 