"use client";

import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import styles from './settings.module.css';
import NeonCheckbox from '../components/NeonCheckbox';
import { saveSettingsToServer, getUserSettingsFromServer } from './actions';

// Массив часовых поясов
const TIMEZONES = [
  { value: 'Europe/Moscow', label: 'Москва (MSK)' },
  { value: 'Europe/Kaliningrad', label: 'Калининград (EET)' },
  { value: 'Europe/Samara', label: 'Самара (SAMT)' },
  { value: 'Asia/Yekaterinburg', label: 'Екатеринбург (YEKT)' },
  { value: 'Asia/Omsk', label: 'Омск (OMST)' },
  { value: 'Asia/Krasnoyarsk', label: 'Красноярск (KRAT)' },
  { value: 'Asia/Irkutsk', label: 'Иркутск (IRKT)' },
  { value: 'Asia/Yakutsk', label: 'Якутск (YAKT)' },
  { value: 'Asia/Vladivostok', label: 'Владивосток (VLAT)' },
  { value: 'Asia/Magadan', label: 'Магадан (MAGT)' },
  { value: 'Asia/Kamchatka', label: 'Камчатка (PETT)' },
  { value: 'Europe/London', label: 'Лондон (GMT)' },
  { value: 'Europe/Paris', label: 'Париж (CET)' },
  { value: 'Europe/Berlin', label: 'Берлин (CET)' },
  { value: 'Europe/Rome', label: 'Рим (CET)' },
  { value: 'Europe/Madrid', label: 'Мадрид (CET)' },
  { value: 'Europe/Athens', label: 'Афины (EET)' },
  { value: 'America/New_York', label: 'Нью-Йорк (EST)' },
  { value: 'America/Chicago', label: 'Чикаго (CST)' },
  { value: 'America/Denver', label: 'Денвер (MST)' },
  { value: 'America/Los_Angeles', label: 'Лос-Анджелес (PST)' },
  { value: 'America/Anchorage', label: 'Анкоридж (AKST)' },
  { value: 'Pacific/Honolulu', label: 'Гонолулу (HST)' },
  { value: 'Asia/Tokyo', label: 'Токио (JST)' },
  { value: 'Asia/Shanghai', label: 'Шанхай (CST)' },
  { value: 'Asia/Singapore', label: 'Сингапур (SGT)' },
  { value: 'Australia/Sydney', label: 'Сидней (AEST)' },
  { value: 'Pacific/Auckland', label: 'Окленд (NZST)' },
  { value: 'UTC', label: 'UTC (Всемирное координированное время)' },
];

// Компонент для отображения загрузки
function LoadingUI() {
  return (
    <div className={styles.loading}>
      <div className={styles.spinner}></div>
      <p>Загрузка...</p>
    </div>
  );
}

// Основной компонент настроек
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
  const [isSaving, setIsSaving] = useState(false);

  // Загрузка данных пользователя и настроек
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Проверяем все возможные источники данных авторизации
        const accessToken = Cookies.get('twitch_access_token');
        const userDataCookie = Cookies.get('twitch_user') || Cookies.get('twitch_user_data');
        const localStorageAuth = localStorage.getItem('is_authenticated') === 'true';
        const localStorageUser = localStorage.getItem('twitch_user');
        
        // Устанавливаем куку для middleware, чтобы указать, что у нас есть данные в localStorage
        if (localStorageUser) {
          Cookies.set('has_local_storage_token', 'true', { 
            expires: 1, // 1 день
            path: '/',
            sameSite: 'lax'
          });
          console.log('Установлена кука has_local_storage_token для middleware');
        }
        
        if (!accessToken && !userDataCookie && !localStorageAuth && !localStorageUser) {
          console.log('Пользователь не авторизован, перенаправляем на страницу авторизации');
          router.push('/auth');
          return;
        }
        
        setIsAuthenticated(true);
        
        // Безопасно получаем данные пользователя
        let userData = null;
        
        if (localStorageUser) {
          try {
            userData = JSON.parse(localStorageUser);
          } catch (e) {
            console.error('Ошибка при парсинге данных пользователя из localStorage:', e);
          }
        } else if (userDataCookie) {
          try {
            userData = JSON.parse(userDataCookie);
          } catch (e) {
            console.error('Ошибка при парсинге данных пользователя из cookie:', e);
          }
        }
        
        if (userData && userData.id) {
          setUserId(userData.id);
          
          // Загружаем сохраненные настройки
          try {
            const savedSettingsStr = localStorage.getItem(`settings_${userData.id}`);
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
              
              // В будущем можно получать настройки с сервера
              try {
                const serverSettings = await getUserSettingsFromServer(userData.id);
                if (serverSettings) {
                  setTheme(serverSettings.theme);
                  setFontSize(serverSettings.fontSize);
                  setTimezone(serverSettings.timezone);
                  setLanguage(serverSettings.language);
                }
              } catch (err) {
                console.error('Ошибка при получении настроек с сервера:', err);
              }
            }
          } catch (e) {
            console.error('Ошибка при загрузке настроек:', e);
          }
        } else {
          console.warn('Данные пользователя получены, но ID отсутствует');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Ошибка при проверке аутентификации:', error);
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Обработчик сохранения настроек
  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      const settings = { theme, fontSize, timezone, language };
      
      // Сохраняем пользовательские настройки в localStorage
      if (userId) {
        localStorage.setItem(`settings_${userId}`, JSON.stringify(settings));
      }
      
      // Также обновляем глобальные настройки для применения на всех страницах
      localStorage.setItem('global_theme', theme);
      localStorage.setItem('global_fontSize', fontSize);
      
      // Применяем настройки
      applySettings(settings);
      
      // Сохранение настроек на сервере (если будет реализовано в будущем)
      if (userId) {
        const result = await saveSettingsToServer(settings, userId);
        setSaveMessage(result.message);
      } else {
        setSaveMessage('Настройки успешно сохранены!');
      }
      
      // Скрываем сообщение через 3 секунды
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
    } finally {
      setIsSaving(false);
    }
  };

  // Функция применения настроек
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
      
      // Применяем язык интерфейса
      document.documentElement.lang = settings.language;
      localStorage.setItem('app_language', settings.language);
      
      // Создаем событие для обновления языка на всех страницах
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('languageChange'));
      }
    } catch (error) {
      console.error('Ошибка при применении настроек:', error);
    }
  };

  if (!isAuthenticated || loading) {
    return <LoadingUI />;
  }

  return (
    <div className={styles.settingsContainer}>
      <h1>Настройки профиля</h1>
      
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
          {TIMEZONES.map(tz => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
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
        <button 
          className={styles.button} 
          onClick={handleSaveSettings}
          disabled={isSaving}
        >
          {isSaving ? 'Сохранение...' : 'Сохранить настройки'}
        </button>
        <button className={styles.button} onClick={() => router.push('/menu')}>
          Вернуться в меню
        </button>
      </div>
    </div>
  );
} 