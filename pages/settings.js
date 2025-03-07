"use client";

import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/router';
import styles from './settings.module.css';

export default function Settings() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [theme, setTheme] = useState('base');
  const [fontSize, setFontSize] = useState('normal');
  const [timezone, setTimezone] = useState('Europe/Moscow');
  const [language, setLanguage] = useState('ru');
  const [loading, setLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    try {
      const accessToken = Cookies.get('twitch_access_token');
      if (!accessToken) {
        router.push('/auth');
      } else {
        setIsAuthenticated(true);
        
        // Безопасно получаем данные пользователя
        try {
          const storedUser = localStorage.getItem('twitch_user');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            const userId = parsedUser.id || 'unknown';
            setUserId(userId);
            
            // Загружаем сохраненные настройки
            try {
              const savedSettingsStr = localStorage.getItem(`settings_${userId}`);
              if (savedSettingsStr) {
                const savedSettings = JSON.parse(savedSettingsStr);
                setTheme(savedSettings.theme || 'base');
                setFontSize(savedSettings.fontSize || 'normal');
                setTimezone(savedSettings.timezone || 'Europe/Moscow');
                setLanguage(savedSettings.language || 'ru');
              } else {
                // Если нет пользовательских настроек, проверяем глобальные
                const globalTheme = localStorage.getItem('global_theme');
                const globalFontSize = localStorage.getItem('global_fontSize');
                
                if (globalTheme) setTheme(globalTheme);
                if (globalFontSize) setFontSize(globalFontSize);
              }
            } catch (e) {
              console.error('Ошибка при загрузке настроек:', e);
            }
          }
        } catch (e) {
          console.error('Ошибка при получении данных пользователя:', e);
        }
        
        setLoading(false);
      }
    } catch (error) {
      console.error('Ошибка при проверке аутентификации:', error);
      setLoading(false);
    }
  }, [router]);

  const handleSaveSettings = () => {
    try {
      const settings = { theme, fontSize, timezone, language };
      
      // Сохраняем пользовательские настройки
      if (userId) {
        localStorage.setItem(`settings_${userId}`, JSON.stringify(settings));
      }
      
      // Также обновляем глобальные настройки для применения на всех страницах
      localStorage.setItem('global_theme', theme);
      localStorage.setItem('global_fontSize', fontSize);
      
      // Применяем настройки
      applySettings(settings);
      
      // Показываем сообщение об успешном сохранении
      setSaveMessage('Настройки успешно сохранены!');
      setTimeout(() => setSaveMessage(''), 3000);
      
      console.log('Settings saved:', settings);
      
      // Создаем событие для обновления темы на других вкладках
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'global_theme',
          newValue: theme
        }));
      }
    } catch (error) {
      console.error('Ошибка при сохранении настроек:', error);
      setSaveMessage('Ошибка при сохранении настроек. Попробуйте еще раз.');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const applySettings = (settings = { theme, fontSize, timezone, language }) => {
    try {
      // Применяем тему
      document.documentElement.classList.remove('base-theme', 'dark-theme', 'light-theme');
      document.documentElement.classList.add(`${settings.theme}-theme`);
      
      // Применяем размер шрифта
      let fontSizeValue = '16px';
      if (settings.fontSize === 'small') fontSizeValue = '14px';
      if (settings.fontSize === 'large') fontSizeValue = '18px';
      
      document.documentElement.style.setProperty('--base-font-size', fontSizeValue);
    } catch (error) {
      console.error('Ошибка при применении настроек:', error);
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
          <option value="base">Базовая тема (Twitch)</option>
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
          <li>Тема: {theme === 'base' ? 'Базовая' : theme === 'dark' ? 'Тёмная' : 'Светлая'}</li>
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
