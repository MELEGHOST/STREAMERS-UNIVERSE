'use client';

import { useEffect } from 'react';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Инициализируем i18next только один раз
if (!i18n.isInitialized) {
  i18n
    .use(Backend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      fallbackLng: 'ru',
      debug: process.env.NODE_ENV === 'development',
      ns: ['common'],
      defaultNS: 'common',
      interpolation: {
        escapeValue: false, // React уже защищает от XSS
      },
      backend: {
        loadPath: '/locales/{{lng}}/{{ns}}.json',
      },
      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
      },
    });
}

const I18nProvider = ({ children }) => {
  // useEffect для потенциальных будущих эффектов, связанных с i18n
  // В данном случае основная инициализация происходит выше и один раз.
  useEffect(() => {
    // Например, можно было бы менять язык динамически
  }, []);

  return <>{children}</>;
};

export default I18nProvider; 