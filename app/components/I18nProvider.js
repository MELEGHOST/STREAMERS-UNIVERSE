'use client';

import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../lib/i18n';

export default function I18nProvider({ children }) {
  useEffect(() => {
    // 1) Уважаем сохранённый язык (i18nextLng), если он есть
    let stored = null;
    try {
      stored =
        localStorage.getItem('i18nextLng') || localStorage.getItem('app:lang');
    } catch {}

    // 2) Иначе берём из браузера
    const nav = (navigator.language || 'en').toLowerCase();
    const normalizedFromNav = nav.startsWith('ru')
      ? 'ru'
      : nav.startsWith('uk')
        ? 'uk'
        : nav.startsWith('be')
          ? 'be'
          : 'en';

    const target = (stored && stored.split('-')[0]) || normalizedFromNav;

    if (i18n.language !== target) {
      i18n.changeLanguage(target).catch(() => {});
    }
    try {
      document.documentElement.lang = target;
    } catch {}

    // 3) Слушаем смену языка в других вкладках
    const onStorage = (e) => {
      if (
        e.key === 'i18nextLng' &&
        e.newValue &&
        i18n.language !== e.newValue
      ) {
        i18n.changeLanguage(e.newValue).catch(() => {});
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
