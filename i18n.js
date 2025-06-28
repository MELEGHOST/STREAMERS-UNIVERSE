import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

const i18nInstance = i18n
  .use(Backend)
  .use(initReactI18next);

// Подключаем LanguageDetector только на стороне клиента
if (typeof window !== 'undefined') {
  i18nInstance.use(LanguageDetector);
}

i18nInstance.init({
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

export default i18n; 