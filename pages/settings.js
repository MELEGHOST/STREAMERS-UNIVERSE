import React, { useState, useEffect } from 'react';
import { useAuth } from '../src/context/AuthContext';
import styled from 'styled-components';

const SettingsContainer = styled.div`
  padding: 20px;
  background-color: #f5f5f5;
  max-width: 800px;
  margin: 20px auto;
  color: #333;
`;

const Select = styled.select`
  padding: 8px;
  margin: 5px;
  border-radius: 5px;
  border: 1px solid #ddd;
`;

export default function Settings() {
  const { user, isAuthenticated } = useAuth();
  const [theme, setTheme] = useState('dark');
  const [fontSize, setFontSize] = useState('normal');
  const [timezone, setTimezone] = useState('Europe/Moscow');
  const [language, setLanguage] = useState('ru');

  useEffect(() => {
    if (!isAuthenticated) window.location.href = '/auth';
    else {
      const savedSettings = JSON.parse(localStorage.getItem(`settings_${user.id}`)) || {};
      setTheme(savedSettings.theme || 'dark');
      setFontSize(savedSettings.fontSize || 'normal');
      setTimezone(savedSettings.timezone || 'Europe/Moscow');
      setLanguage(savedSettings.language || 'ru');
    }
  }, [isAuthenticated, user?.id]);

  const handleSaveSettings = () => {
    const settings = { theme, fontSize, timezone, language };
    localStorage.setItem(`settings_${user.id}`, JSON.stringify(settings));
    applySettings();
    console.log('Settings saved:', settings);
  };

  const applySettings = () => {
    document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
    document.body.style.fontSize = fontSize === 'small' ? '14px' : fontSize === 'large' ? '18px' : '16px';
  };

  if (!isAuthenticated) return null;

  return (
    <SettingsContainer>
      <h1>Настройки</h1>
      <Select value={theme} onChange={(e) => setTheme(e.target.value)}>
        <option value="dark">Тёмная тема</option>
        <option value="light">Светлая тема</option>
      </Select>
      <Select value={fontSize} onChange={(e) => setFontSize(e.target.value)}>
        <option value="small">Меньше (14px)</option>
        <option value="normal">Нормальный (16px)</option>
        <option value="large">Больше (18px)</option>
      </Select>
      <Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
        <option value="Europe/Moscow">Москва (MSK)</option>
        <option value="UTC">UTC</option>
        <option value="America/New_York">Нью-Йорк (EST)</option>
      </Select>
      <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
        <option value="ru">Русский</option>
        <option value="en">Английский</option>
      </Select>
      <Button onClick={handleSaveSettings}>Сохранить</Button>
      <p>Текущий часовой пояс: {timezone}, Язык: {language === 'ru' ? 'Русский' : 'English'}</p>
    </SettingsContainer>
  );
}
