'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import styles from './settings.module.css';
import pageStyles from '../../styles/page.module.css';
import { FaArrowLeft, FaPalette } from 'react-icons/fa'; // Иконки
import RouteGuard from '../components/RouteGuard';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher/LanguageSwitcher';

function SettingsPageContent() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isLoading: authLoading, isAuthenticated, currentTheme, toggleTheme } = useAuth();

  // Редирект, если не авторизован
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || !isAuthenticated) {
    return <div className={pageStyles.loadingContainer}><div className="spinner"></div></div>;
  }

  return (
    <div className={styles.settingsContainer}>
      <div className={styles.settingsHeader}>
        <button onClick={() => router.back()} className={styles.backButton}>
          <FaArrowLeft /> {t('backButton')}
        </button>
        <h1 className={styles.header}>{t('settingsTitle')}</h1>
      </div>

      <div className={styles.settingsList}>
        {/* Настройка темы */}
        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <FaPalette className={styles.settingIcon} />
            <span className={styles.settingLabel}>{t('themeSetting')}</span>
          </div>
          <button onClick={toggleTheme} className={styles.themeToggleButton}>
            {currentTheme === 'dark' ? t('themeLight') : t('themeDark')}
          </button>
        </div>

        {/* Настройка языка */}
        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <FaPalette className={styles.settingIcon} />
            <span className={styles.settingLabel}>{t('languageSetting')}</span>
          </div>
          <LanguageSwitcher />
        </div>

        {/* Другие настройки */}
        <div className={`${styles.settingItem} ${styles.disabledSetting}`}>
          <div className={styles.settingInfo}>
            <FaPalette className={styles.settingIcon} />
            <span className={styles.settingLabel}>{t('fontSetting')}</span>
          </div>
          <span className={styles.settingValue}>{t('fontValue')}</span>
        </div>
        <div className={`${styles.settingItem} ${styles.disabledSetting}`}>
          <div className={styles.settingInfo}>
            <FaPalette className={styles.settingIcon} />
            <span className={styles.settingLabel}>{t('timezoneSetting')}</span>
          </div>
          <span className={styles.settingValue}>{t('timezoneValue')}</span>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <RouteGuard>
      <SettingsPageContent />
    </RouteGuard>
  );
} 