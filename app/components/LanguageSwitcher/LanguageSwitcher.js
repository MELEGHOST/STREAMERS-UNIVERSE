'use client';

import { useTranslation } from 'react-i18next';
import styles from './LanguageSwitcher.module.css';

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();

  const languages = [
    { code: 'ru', nameKey: 'languageNameRu', flag: '🇷🇺' },
    { code: 'en', nameKey: 'languageNameEn', flag: '🇬🇧' },
    { code: 'uk', nameKey: 'languageNameUk', flag: '🇺🇦' },
    { code: 'be', nameKey: 'languageNameBe', flag: '🇧🇾' },
  ];

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
          className={`${styles.langButton} ${i18n.language.startsWith(lang.code) ? styles.active : ''}`}
          onClick={() => changeLanguage(lang.code)}
        >
          <span className={styles.flag}>{lang.flag}</span>
          <span className={styles.name}>{t(lang.nameKey)}</span>
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher; 