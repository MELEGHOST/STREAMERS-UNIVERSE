"use client";

import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/router';
import styles from './settings.module.css';

export default function Settings() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [fontSize, setFontSize] = useState('normal');
  const [timezone, setTimezone] = useState('Europe/Moscow');
  const [language, setLanguage] = useState('ru');
  const [loading, setLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    const accessToken = Cookies.get('twitch_access_token');
    if (!accessToken) {
      router.push('/auth');
    } else {
      setIsAuthenticated(true);
      const storedUser = JSON.parse(localStorage.getItem('twitch_user') || '{}');
      const userId = storedUser.id || 'unknown';
      setUserId(userId);

      // Загружаем сохраненные настройки
      const savedSettings = JSON.parse(localStorage.getItem(`settings_${userId}`)) || {};
      setTheme(savedSettings.theme || 'dark');
      setFontSize(savedSettings.fontSize || 'normal');
      setTimezone(savedSettings.timezone || 'Europe/Moscow');
      setLanguage(savedSettings.language || 'ru');
      
      // Применяем настройки при загрузке
      applySettings(savedSettings);
      setLoading(false);
    }
  }, [router]);

  const handleSaveSettings = () => {
    const settings = { theme, fontSize, timezone, language };
    localStorage.setItem(`settings_${userId}`, JSON.stringify(settings));
    applySettings(settings);
    
    // Показываем сообщение об успешном сохранении
    setSaveMessage('Настройки успешно сохранены!');
    setTimeout(() => setSaveMessage(''), 3000);
    
    console.log('Settings saved:', settings);
  };

  const applySettings = (settings = { theme, fontSize, timezone, language }) => {
    // Применяем тему
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
      document.documentElement.classList.remove('light-theme');
    } else {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark-theme');
    }
    
    // Применяем размер шрифта
    let fontSizeValue = '16px';
    if (settings.fontSize === 'small') fontSizeValue = '14px';
    if (settings.fontSize === 'large') fontSizeValue = '18px';
    
    document.documentElement.style.setProperty('--base-font-size', fontSizeValue);
    
    // Добавляем CSS переменные для темы, если их еще нет
    if (!document.getElementById('theme-styles')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'theme-styles';
      styleElement.innerHTML = `
        :root.dark-theme {
          --bg-color: #121212;
          --text-color: #ffffff;
          --primary-color: #7B41C9;
          --secondary-color: #5A2E94;
          --accent-color: #9B6AE8;
        }
        
        :root.light-theme {
          --bg-color: #f5f5f5;
          --text-color: #333333;
          --primary-color: #7B41C9;
          --secondary-color: #5A2E94;
          --accent-color: #9B6AE8;
        }
        
        body {
          background-color: var(--bg-color);
          color: var(--text-color);
          font-size: var(--base-font-size);
          transition: background-color 0.3s, color 0.3s, font-size 0.3s;
        }
      `;
      document.head.appendChild(styleElement);
    }
  };

  if (!isAuthenticated || loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className={styles.settingsContainer}>
      <h1>Настройки</h1>
      
      <div className={styles.settingGroup}>
        <label htmlFor="theme">Тема оформления:</label>
        <select 
          id="theme"
          className={styles.select} 
          value={theme} 
          onChange={(e) => setTheme(e.target.value)}
        >
          <option value="dark">Тёмная тема</option>
          <option value="light">Светлая тема</option>
        </select>
      </div>
      
      <div className={styles.settingGroup}>
        <label htmlFor="fontSize">Размер шрифта:</label>
        <select 
          id="fontSize"
          className={styles.select} 
          value={fontSize} 
          onChange={(e) => setFontSize(e.target.value)}
        >
          <option value="small">Меньше (14px)</option>
          <option value="normal">Нормальный (16px)</option>
          <option value="large">Больше (18px)</option>
        </select>
      </div>
      
      <div className={styles.settingGroup}>
        <label htmlFor="timezone">Часовой пояс:</label>
        <select 
          id="timezone"
          className={styles.select} 
          value={timezone} 
          onChange={(e) => setTimezone(e.target.value)}
        >
          <option value="Europe/Moscow">Москва (MSK)</option>
          <option value="UTC">UTC</option>
          <option value="America/New_York">Нью-Йорк (EST)</option>
        </select>
      </div>
      
      <div className={styles.settingGroup}>
        <label htmlFor="language">Язык интерфейса:</label>
        <select 
          id="language"
          className={styles.select} 
          value={language} 
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="ru">Русский</option>
          <option value="en">Английский</option>
        </select>
      </div>
      
      {saveMessage && <div className={styles.saveMessage}>{saveMessage}</div>}
      
      <div className={styles.actionButtons}>
        <button className={styles.button} onClick={handleSaveSettings}>Сохранить настройки</button>
        <button className={styles.button} onClick={() => router.push('/menu')}>
          Вернуться в меню
        </button>
      </div>
      
      <div className={styles.currentSettings}>
        <p>Текущие настройки:</p>
        <ul>
          <li>Тема: {theme === 'dark' ? 'Тёмная' : 'Светлая'}</li>
          <li>Размер шрифта: {fontSize === 'small' ? 'Меньше' : fontSize === 'large' ? 'Больше' : 'Нормальный'}</li>
          <li>Часовой пояс: {timezone}</li>
          <li>Язык: {language === 'ru' ? 'Русский' : 'English'}</li>
        </ul>
      </div>
    </div>
  );
}

export async function getStaticProps() {
  return {
    props: {}, // Нет данных для prerendering, всё загружается на клиенте
  };
}
