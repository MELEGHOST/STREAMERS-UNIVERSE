'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import styles from './settings.module.css';
import pageStyles from '../../styles/page.module.css';
import { FaArrowLeft, FaPalette } from 'react-icons/fa'; // Иконки
import RouteGuard from '../components/RouteGuard';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher/LanguageSwitcher';

const availableFonts = [
  { name: 'Roboto', value: 'Roboto, sans-serif' },
  { name: 'Open Sans', value: '"Open Sans", sans-serif' },
  { name: 'Montserrat', value: 'Montserrat, sans-serif' },
  { name: 'Lato', value: '"Lato", sans-serif' },
  { name: 'Oswald', value: '"Oswald", sans-serif' },
];

function SettingsPageContent() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isLoading: authLoading, isAuthenticated, currentTheme, toggleTheme } = useAuth();
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState(availableFonts[0].value);

  useEffect(() => {
    const savedFontSize = localStorage.getItem('fontSize');
    const savedFontFamily = localStorage.getItem('fontFamily');

    if (savedFontSize) {
      const size = parseInt(savedFontSize, 10);
      setFontSize(size);
      document.documentElement.style.fontSize = `${size}px`;
    }

    if (savedFontFamily) {
      setFontFamily(savedFontFamily);
      document.documentElement.style.fontFamily = savedFontFamily;
    }
  }, []);

  const handleFontSizeChange = (e) => {
    const newSize = e.target.value;
    setFontSize(newSize);
    localStorage.setItem('fontSize', newSize);
    document.documentElement.style.fontSize = `${newSize}px`;
  };

  const handleFontFamilyChange = (e) => {
    const newFamily = e.target.value;
    setFontFamily(newFamily);
    localStorage.setItem('fontFamily', newFamily);
    document.documentElement.style.fontFamily = newFamily;
  };

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

        {/* Настройка шрифта */}
        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <FaPalette className={styles.settingIcon} />
            <span className={styles.settingLabel}>{t('fontSetting')}</span>
          </div>
          <div className={styles.fontControls}>
            <input
              type="range"
              min="12"
              max="24"
              value={fontSize}
              onChange={handleFontSizeChange}
              className={styles.fontSizeSlider}
            />
            <select
              value={fontFamily}
              onChange={handleFontFamilyChange}
              className={styles.fontFamilySelector}
            >
              {availableFonts.map(font => (
                <option key={font.name} value={font.value}>{font.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Другие настройки */}
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