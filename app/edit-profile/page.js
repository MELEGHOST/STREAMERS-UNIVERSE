'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './edit-profile.module.css';
import Cookies from 'js-cookie';
import NeonCheckbox from '../components/NeonCheckbox';
import { DataStorage } from '../utils/dataStorage';

export default function EditProfile() {
  const [userData, setUserData] = useState(null);
  const [socialLinks, setSocialLinks] = useState({
    description: '',
    twitch: '',
    youtube: '',
    discord: '',
    telegram: '',
    vk: '',
    yandexMusic: '',
    isMusician: false
  });
  const [birthday, setBirthday] = useState('');
  const [showBirthday, setShowBirthday] = useState(true);
  const [statsVisibility, setStatsVisibility] = useState({
    followers: true,
    followings: true,
    streams: true,
    channel: true,
    accountInfo: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Получаем данные пользователя из DataStorage
        const userData = await DataStorage.getData('user');
        
        if (!userData || !userData.id) {
          router.push('/login');
          return;
        }
        
        setUserData(userData);
        
        // Загружаем день рождения пользователя из localStorage, если он есть
        const userBirthday = localStorage.getItem(`birthday_${userData.id}`);
        if (userBirthday) {
          setBirthday(userBirthday);
        }
        
        // Загружаем настройку видимости дня рождения
        const birthdayVisibility = localStorage.getItem(`birthday_visibility_${userData.id}`);
        if (birthdayVisibility !== null) {
          setShowBirthday(birthdayVisibility === 'true');
        }
        
        // Загружаем настройки видимости статистики
        const savedStatsVisibility = localStorage.getItem(`stats_visibility_${userData.id}`);
        if (savedStatsVisibility) {
          setStatsVisibility(JSON.parse(savedStatsVisibility));
        }
        
        await fetchSocialLinks(userData.id);
      } catch (error) {
        console.error('Ошибка при загрузке данных пользователя:', error);
        setError('Не удалось загрузить данные пользователя. Пожалуйста, попробуйте позже.');
      } finally {
        setLoading(false);
      }
    };
    
    loadUserData();
  }, []);

  const fetchSocialLinks = async (userId) => {
    try {
      // Сначала пробуем получить данные из localStorage
      const savedLinks = localStorage.getItem(`social_links_${userId}`);
      
      if (savedLinks) {
        setSocialLinks(JSON.parse(savedLinks));
        return;
      }
      
      // Если в localStorage нет данных, пробуем получить с сервера
      const response = await fetch('/api/user-socials');
      
      if (response.ok) {
        const data = await response.json();
        setSocialLinks(data);
      }
    } catch (error) {
      console.error('Ошибка при загрузке социальных ссылок:', error);
    }
  };

  const handleSocialLinksChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSocialLinks(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleBirthdayChange = (e) => {
    setBirthday(e.target.value);
  };

  const handleShowBirthdayChange = (e) => {
    setShowBirthday(e.target.checked);
  };

  const handleStatsVisibilityChange = (e) => {
    const { name, checked } = e.target;
    setStatsVisibility(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSaveSuccess(false);
    setSaveError(false);
    
    try {
      if (userData && userData.id) {
        // Сохраняем социальные ссылки в localStorage
        localStorage.setItem(`social_links_${userData.id}`, JSON.stringify(socialLinks));
        
        // Сохраняем день рождения в localStorage
        if (birthday) {
          localStorage.setItem(`birthday_${userData.id}`, birthday);
        } else {
          localStorage.removeItem(`birthday_${userData.id}`);
        }
        
        // Сохраняем настройку видимости дня рождения
        localStorage.setItem(`birthday_visibility_${userData.id}`, showBirthday.toString());
        
        // Сохраняем настройки видимости статистики
        localStorage.setItem(`stats_visibility_${userData.id}`, JSON.stringify(statsVisibility));
        
        // Пробуем сохранить данные на сервере
        try {
          const response = await fetch('/api/user-socials', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(socialLinks)
          });
          
          if (!response.ok) {
            console.warn('Не удалось сохранить данные на сервере, но они сохранены локально');
          }
        } catch (serverError) {
          console.warn('Ошибка при сохранении на сервере:', serverError);
        }
        
        setSaveSuccess(true);
        
        // Ожидаем немного для отображения сообщения об успехе и перенаправляем на профиль
        setTimeout(() => {
          // Принудительно обновляем данные в localStorage и DataStorage для синхронизации
          if (userData) {
            // Если есть URL изображения профиля, сохраняем и его для обновления аватарки
            if (userData.profile_image_url) {
              const updatedUserData = { ...userData };
              localStorage.setItem('twitch_user', JSON.stringify(updatedUserData));
              DataStorage.saveData('user', updatedUserData);
            }
          }
          
          // Перенаправляем на профиль с параметром обновления для обхода кэша
          router.push('/profile?refresh=' + Date.now());
        }, 1500);
      }
    } catch (error) {
      console.error('Ошибка при сохранении данных:', error);
      setSaveError('Произошла ошибка при сохранении данных. Пожалуйста, попробуйте снова.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.editProfileContainer}>
      <h1 className={styles.editProfileTitle}>Редактирование профиля</h1>
      
      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Загрузка данных...</p>
        </div>
      ) : error ? (
        <div className={styles.error}>
          <p>{error}</p>
          <button className={styles.button} onClick={() => router.push('/menu')}>
            Вернуться в меню
          </button>
        </div>
      ) : (
        <form className={styles.editForm} onSubmit={handleSubmit}>
          {/* Секция описания */}
          <div className={styles.formSection}>
            <h2>Описание профиля</h2>
            <div className={styles.inputGroup}>
              <label htmlFor="description">О себе:</label>
              <textarea
                id="description"
                name="description"
                className={styles.textarea}
                value={socialLinks.description}
                onChange={handleSocialLinksChange}
                placeholder="Расскажите о себе..."
                maxLength={500}
              />
              <div className={styles.charCount}>
                {socialLinks.description.length}/500
              </div>
            </div>
          </div>
          
          {/* Секция дня рождения */}
          <div className={styles.formSection}>
            <h2>День рождения</h2>
            <div className={styles.inputGroup}>
              <label htmlFor="birthday">Дата рождения:</label>
              <input
                type="date"
                id="birthday"
                name="birthday"
                className={styles.input}
                value={birthday}
                onChange={handleBirthdayChange}
              />
              <p className={styles.birthdayNote}>
                В день рождения вы получите 100 стример-коинов в подарок! 🎁
              </p>
            </div>
            <div className={styles.checkboxGroup}>
              <NeonCheckbox
                label="Показывать день рождения другим пользователям"
                checked={showBirthday}
                onChange={handleShowBirthdayChange}
                name="showBirthday"
              />
            </div>
          </div>
          
          {/* Секция настроек видимости статистики */}
          <div className={styles.formSection}>
            <h2>Настройки видимости статистики</h2>
            <p className={styles.sectionDescription}>
              Выберите, какую информацию вы хотите отображать в своем профиле:
            </p>
            
            <div className={styles.checkboxGrid}>
              <div className={styles.checkboxGroup}>
                <NeonCheckbox
                  label="Подписчики"
                  checked={statsVisibility.followers}
                  onChange={handleStatsVisibilityChange}
                  name="followers"
                />
              </div>
              
              <div className={styles.checkboxGroup}>
                <NeonCheckbox
                  label="Подписки"
                  checked={statsVisibility.followings}
                  onChange={handleStatsVisibilityChange}
                  name="followings"
                />
              </div>
              
              <div className={styles.checkboxGroup}>
                <NeonCheckbox
                  label="Стримы"
                  checked={statsVisibility.streams}
                  onChange={handleStatsVisibilityChange}
                  name="streams"
                />
              </div>
              
              <div className={styles.checkboxGroup}>
                <NeonCheckbox
                  label="Информация о канале"
                  checked={statsVisibility.channel}
                  onChange={handleStatsVisibilityChange}
                  name="channel"
                />
              </div>
              
              <div className={styles.checkboxGroup}>
                <NeonCheckbox
                  label="Информация об аккаунте"
                  checked={statsVisibility.accountInfo}
                  onChange={handleStatsVisibilityChange}
                  name="accountInfo"
                />
              </div>
            </div>
          </div>
          
          {/* Секция социальных сетей */}
          <div className={styles.formSection}>
            <h2>Социальные сети</h2>
            
            <div className={styles.inputGroup}>
              <label htmlFor="twitch">Twitch:</label>
              <div className={styles.inputWithIcon}>
                <span className={styles.inputIcon}>🟣</span>
                <input
                  type="text"
                  id="twitch"
                  name="twitch"
                  className={styles.input}
                  value={socialLinks.twitch}
                  onChange={handleSocialLinksChange}
                  placeholder="https://twitch.tv/username"
                />
              </div>
            </div>
            
            <div className={styles.inputGroup}>
              <label htmlFor="youtube">YouTube:</label>
              <div className={styles.inputWithIcon}>
                <span className={styles.inputIcon}>🔴</span>
                <input
                  type="text"
                  id="youtube"
                  name="youtube"
                  className={styles.input}
                  value={socialLinks.youtube}
                  onChange={handleSocialLinksChange}
                  placeholder="https://youtube.com/c/username"
                />
              </div>
            </div>
            
            <div className={styles.inputGroup}>
              <label htmlFor="discord">Discord:</label>
              <div className={styles.inputWithIcon}>
                <span className={styles.inputIcon}>🔵</span>
                <input
                  type="text"
                  id="discord"
                  name="discord"
                  className={styles.input}
                  value={socialLinks.discord}
                  onChange={handleSocialLinksChange}
                  placeholder="https://discord.gg/invite"
                />
              </div>
            </div>
            
            <div className={styles.inputGroup}>
              <label htmlFor="telegram">Telegram:</label>
              <div className={styles.inputWithIcon}>
                <span className={styles.inputIcon}>📱</span>
                <input
                  type="text"
                  id="telegram"
                  name="telegram"
                  className={styles.input}
                  value={socialLinks.telegram}
                  onChange={handleSocialLinksChange}
                  placeholder="https://t.me/username"
                />
              </div>
            </div>
            
            <div className={styles.inputGroup}>
              <label htmlFor="vk">ВКонтакте:</label>
              <div className={styles.inputWithIcon}>
                <span className={styles.inputIcon}>💙</span>
                <input
                  type="text"
                  id="vk"
                  name="vk"
                  className={styles.input}
                  value={socialLinks.vk}
                  onChange={handleSocialLinksChange}
                  placeholder="https://vk.com/username"
                />
              </div>
            </div>
            
            <div className={styles.checkboxGroup}>
              <NeonCheckbox
                label="Я музыкант"
                checked={socialLinks.isMusician}
                onChange={(e) => handleSocialLinksChange({ target: { name: 'isMusician', checked: e.target.checked } })}
                name="isMusician"
              />
            </div>
            
            {socialLinks.isMusician && (
              <div className={styles.inputGroup}>
                <label htmlFor="yandexMusic">Яндекс Музыка:</label>
                <div className={styles.inputWithIcon}>
                  <span className={styles.inputIcon}>🎵</span>
                  <input
                    type="text"
                    id="yandexMusic"
                    name="yandexMusic"
                    className={styles.input}
                    value={socialLinks.yandexMusic}
                    onChange={handleSocialLinksChange}
                    placeholder="https://music.yandex.ru/artist/..."
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className={styles.buttonGroup}>
            <button
              type="submit"
              className={styles.button}
              disabled={submitting}
            >
              {submitting ? 'Сохранение...' : 'Сохранить профиль'}
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => router.push('/profile')}
            >
              Вернуться в профиль
            </button>
          </div>
          
          {saveSuccess && (
            <div className={styles.successMessage}>
              Профиль успешно обновлен!
            </div>
          )}
          
          {saveError && (
            <div className={styles.errorMessage}>
              {saveError}
            </div>
          )}
        </form>
      )}
    </div>
  );
} 