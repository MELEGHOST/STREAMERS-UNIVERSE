'use client';

import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../lib/i18n';

export default function I18nProvider({ children }) {
  useEffect(() => {
    const lang = (navigator.language || 'en').toLowerCase();
    const normalized = lang.startsWith('ru') ? 'ru' : lang.startsWith('uk') ? 'uk' : lang.startsWith('be') ? 'be' : 'en';
    if (i18n.language !== normalized) {
      i18n.changeLanguage(normalized).catch(() => {});
    }
  }, []);
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}