'use client';

import { useEffect } from 'react';

const ThemeProvider = ({ children }) => {
  useEffect(() => {
    // Применяем сохраненные настройки темы при загрузке страницы
    const applyGlobalTheme = () => {
      const theme = localStorage.getItem('global_theme') || 'base';
      const fontSize = localStorage.getItem('global_fontSize') || 'normal';
      
      // Применяем тему
      document.documentElement.classList.remove('base-theme', 'dark-theme', 'light-theme');
      document.documentElement.classList.add(`${theme}-theme`);
      
      // Применяем размер шрифта
      let fontSizeValue = '16px';
      if (fontSize === 'small') fontSizeValue = '14px';
      if (fontSize === 'large') fontSizeValue = '18px';
      
      document.documentElement.style.setProperty('--base-font-size', fontSizeValue);
      
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
      }
    };
    
    // Применяем тему при загрузке страницы
    if (typeof window !== 'undefined') {
      applyGlobalTheme();
    }
  }, []);
  
  return children;
};

export default ThemeProvider; 