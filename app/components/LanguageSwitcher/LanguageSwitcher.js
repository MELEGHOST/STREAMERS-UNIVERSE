'use client';

import { useTranslation } from 'react-i18next';
import styles from './LanguageSwitcher.module.css';
import { useRouter } from 'next/navigation';

const languages = [
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦' },
];

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const router = useRouter();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng).then(() => {
      window.location.reload();
    });
  };

  return (
    <div className={styles.switcherContainer}>
      {languages.map((lang) => (
        <button
          key={lang.code}
          className={`${styles.langButton} ${i18n.language === lang.code ? styles.active : ''}`}
          onClick={() => changeLanguage(lang.code)}
        >
          <span className={styles.flag}>{lang.flag}</span>
          <span className={styles.name}>{lang.name}</span>
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher; 