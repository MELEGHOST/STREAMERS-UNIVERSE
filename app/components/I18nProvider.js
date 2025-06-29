'use client';

import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import { useEffect } from 'react';

// Инициализируем i18next только один раз
if (!i18n.isInitialized) {
  i18n
    .use(Backend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      fallbackLng: 'ru',
      lng: 'ru',
      debug: process.env.NODE_ENV === 'development',
      interpolation: {
        escapeValue: false, // React уже защищает от XSS
      },
      backend: {
        loadPath: '/locales/{{lng}}/common.json',
      },
    });
}

export default function I18nProvider({ children }) {
  useEffect(() => {
    // This effect can be used to handle language changes or other i18n-related side effects.
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
} 