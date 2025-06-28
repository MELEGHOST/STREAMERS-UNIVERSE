'use client';

import { useEffect } from 'react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import en from '../../public/locales/en/common.json';
import ru from '../../public/locales/ru/common.json';
import uk from '../../public/locales/uk/common.json';

// Инициализируем i18next только один раз
if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { common: en },
        ru: { common: ru },
        uk: { common: uk }
      },
      lng: 'ru', // Язык по умолчанию
      fallbackLng: 'ru',
      interpolation: {
        escapeValue: false, // React уже защищает от XSS
      }
    });
}

const I18nProvider = ({ children }) => {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};

export default I18nProvider; 