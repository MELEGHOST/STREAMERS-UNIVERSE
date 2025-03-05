"use client";

import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import styles from './settings.module.css';

export default function Settings() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [fontSize, setFontSize] = useState('normal');
  const [timezone, setTimezone] = useState('Europe/Moscow');
  const [language, setLanguage] = useState('ru');

  useEffect(() => {
    const accessToken = Cookies.get('twitch_access_token');
    if (!accessToken) {
      window.location.href = '/auth';
    } else {
      setIsAuthenticated(true);
      const storedUser = JSON.parse(localStorage.getItem('twitch_user') || '{}');
      const userId = storedUser.id || 'unknown'; // ID из localStorage
      setUserId(userId);

      const savedSettings = JSON.parse(localStorage.getItem(`settings_${userId}`)) || {};
      setTheme(savedSettings.theme || 'dark');
      setFontSize(savedSettings.fontSize || 'normal');
      setTimezone(savedSettings.timezone || 'Europe/Moscow');
      setLanguage(savedSettings.language || 'ru');
      applySettings(savedSettings);
    }
  }, []);

  const handleSaveSettings = () => {
    const settings = { theme, fontSize, timezone, language };
    localStorage.setItem(`settings_${userId}`, JSON.stringify(settings));
    applySettings(settings);
    console.log('Settings saved:', settings);
  };

  const applySettings = (settings = { theme, fontSize, timezone, language }) => {
    document.body.className = settings.theme === 'dark' ? 'dark-theme' : 'light-theme';
    document.body.style.fontSize = settings.fontSize === 'small' ? '14px' : settings.fontSize === 'large' ? '18px' : '16px';
  };

  if (!isAuthenticated) return null;

  return (
    <div className={styles.settingsContainer}>
      <h1>Настройки</h1>
      <select className={styles.select} value={theme} onChange={(e) => setTheme(e.target.value)}>
        <option value="dark">Тёмная тема</option>
        <option value="light">Светлая тема</option>
      </select>
      <select className={styles.select} value={fontSize} onChange={(e) => setFontSize(e.target.value)}>
        <option value="small">Меньше (14px)</option>
        <option value="normal">Нормальный (16px)</option>
        <option value="large">Больше (18px)</option>
      </select>
      <select className={styles.select} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
        <option value="Europe/Moscow">Москва (MSK)</option>
        <option value="UTC">UTC</option>
        <option value="America/New_York">Нью-Йорк (EST)</option>
      </select>
      <select className={styles.select} value={language} onChange={(e) => setLanguage(e.target.value)}>
        <option value="ru">Русский</option>
        <option value="en">Английский</option>
      </select>
      <button className={styles.button} onClick={handleSaveSettings}>Сохранить</button>
      <p>Текущий часовой пояс: {timezone}, Язык: {language === 'ru' ? 'Русский' : 'English'}</p>
    </div>
  );
}

export async function getStaticProps() {
  return {
    props: {}, // Нет данных для prerendering, всё загружается на клиенте
  };
}
