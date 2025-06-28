'use client';

import { I18nextProvider, initReactI18next } from 'react-i18next';
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from '../../public/locales/en/common.json';
import ru from '../../public/locales/ru/common.json';
import uk from '../../public/locales/uk/common.json';

// Инициализируем i18next только один раз
if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        en: { common: en },
        ru: { common: ru },
        uk: { common: uk }
      },
      fallbackLng: 'ru',
      interpolation: {
        escapeValue: false, // React уже защищает от XSS
      },
      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
      }
    });
}

const I18nProvider = ({ children }) => {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};

export default I18nProvider; 