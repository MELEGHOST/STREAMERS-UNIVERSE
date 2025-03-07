'use client';

import { useEffect } from 'react';

const ThemeProvider = ({ children }) => {
  useEffect(() => {
    // Применяем сохраненные настройки темы при загрузке страницы
    const applyGlobalTheme = () => {
      try {
        // Получаем данные пользователя для определения ID
        const storedUserData = localStorage.getItem('twitch_user');
        let userId = 'unknown';
        
        if (storedUserData) {
          try {
            const parsedData = JSON.parse(storedUserData);
            userId = parsedData.id || 'unknown';
          } catch (e) {
            console.error('Ошибка при парсинге данных пользователя:', e);
          }
        }
        
        // Пытаемся получить настройки из пользовательских настроек
        let userSettings = {};
        try {
          const savedSettings = localStorage.getItem(`settings_${userId}`);
          if (savedSettings) {
            userSettings = JSON.parse(savedSettings);
          }
        } catch (e) {
          console.error('Ошибка при загрузке пользовательских настроек:', e);
        }
        
        // Если пользовательских настроек нет, используем глобальные
        const theme = userSettings.theme || localStorage.getItem('global_theme') || 'base';
        const fontSize = userSettings.fontSize || localStorage.getItem('global_fontSize') || 'normal';
        const language = userSettings.language || localStorage.getItem('app_language') || 'ru';
        
        // Сохраняем настройки глобально для использования на других страницах
        localStorage.setItem('global_theme', theme);
        localStorage.setItem('global_fontSize', fontSize);
        localStorage.setItem('app_language', language);
        
        // Применяем тему
        document.documentElement.classList.remove('base-theme', 'dark-theme', 'light-theme');
        document.documentElement.classList.add(`${theme}-theme`);
        
        // Применяем размер шрифта
        let fontSizeValue = '16px';
        if (fontSize === 'small') fontSizeValue = '14px';
        if (fontSize === 'large') fontSizeValue = '18px';
        
        document.documentElement.style.setProperty('--base-font-size', fontSizeValue);
        
        // Применяем язык
        document.documentElement.lang = language;
        
        // Добавляем CSS переменные для темы, если их еще нет
        if (!document.getElementById('theme-styles')) {
          const styleElement = document.createElement('style');
          styleElement.id = 'theme-styles';
          styleElement.innerHTML = `
            :root {
              --base-font-size: ${fontSizeValue};
            }
            
            :root.base-theme {
              --bg-color: #1a1a4a;
              --text-color: #ffffff;
              --primary-color: #9146FF;
              --secondary-color: #7B41C9;
              --accent-color: #9B6AE8;
            }
            
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
            
            /* Глобальные стили для всех страниц */
            .settingsContainer, .profileContainer, .menuContainer, 
            .searchContainer, .followersContainer, .subscriptionsContainer {
              background-color: var(--bg-color);
              color: var(--text-color);
            }
            
            h1, h2, h3 {
              color: var(--primary-color);
            }
            
            button {
              background-color: var(--primary-color);
              color: white;
            }
            
            button:hover {
              background-color: var(--secondary-color);
            }
            
            input, select {
              background-color: var(--bg-color);
              color: var(--text-color);
              border: 1px solid var(--secondary-color);
            }
            
            a {
              color: var(--primary-color);
            }
            
            a:hover {
              color: var(--secondary-color);
            }
          `;
          document.head.appendChild(styleElement);
        } else {
          // Обновляем существующие стили
          const styleElement = document.getElementById('theme-styles');
          styleElement.innerHTML = `
            :root {
              --base-font-size: ${fontSizeValue};
            }
            
            :root.base-theme {
              --bg-color: #1a1a4a;
              --text-color: #ffffff;
              --primary-color: #9146FF;
              --secondary-color: #7B41C9;
              --accent-color: #9B6AE8;
            }
            
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
            
            /* Глобальные стили для всех страниц */
            .settingsContainer, .profileContainer, .menuContainer, 
            .searchContainer, .followersContainer, .subscriptionsContainer {
              background-color: var(--bg-color);
              color: var(--text-color);
            }
            
            h1, h2, h3 {
              color: var(--primary-color);
            }
            
            button {
              background-color: var(--primary-color);
              color: white;
            }
            
            button:hover {
              background-color: var(--secondary-color);
            }
            
            input, select {
              background-color: var(--bg-color);
              color: var(--text-color);
              border: 1px solid var(--secondary-color);
            }
            
            a {
              color: var(--primary-color);
            }
            
            a:hover {
              color: var(--secondary-color);
            }
          `;
        }
      } catch (error) {
        console.error('Ошибка при применении темы:', error);
      }
    };
    
    // Применяем тему при загрузке страницы
    if (typeof window !== 'undefined') {
      applyGlobalTheme();
      
      // Добавляем слушатель события для обновления темы при изменении localStorage
      window.addEventListener('storage', (event) => {
        if (event.key === 'global_theme' || event.key === 'global_fontSize' || 
            event.key === 'app_language' || event.key?.startsWith('settings_')) {
          applyGlobalTheme();
        }
      });
      
      // Добавляем слушатель для события изменения языка
      window.addEventListener('languageChange', applyGlobalTheme);
    }
    
    // Очистка при размонтировании
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', applyGlobalTheme);
        window.removeEventListener('languageChange', applyGlobalTheme);
      }
    };
  }, []);
  
  return children;
};

export default ThemeProvider; 