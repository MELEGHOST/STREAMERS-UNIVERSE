'use client';

import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import styles from './profile.module.css';
import { useRouter } from 'next/router';

export default function EditProfile() {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    const accessToken = Cookies.get('twitch_access_token');

    if (!accessToken) {
      setError('Not authenticated');
      setLoading(false);
      router.push('/auth');
      return;
    }

    const fetchSocialLinks = async () => {
      try {
        // Сначала пробуем новый API-эндпоинт в директории app
        let response = await fetch('/api/user-socials', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
        });

        // Если новый API-эндпоинт недоступен, пробуем старый в директории pages
        if (!response.ok && response.status === 404) {
          console.log('Новый API-эндпоинт недоступен, пробуем старый');
          response = await fetch('/api/socials', {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
          });
        }

        if (!response.ok) {
          // Если оба API-эндпоинта недоступны, используем локальные данные
          console.log(`Не удалось получить социальные ссылки: ${response.status}`);
          
          // Пробуем получить данные из localStorage
          const userId = JSON.parse(localStorage.getItem('twitch_user') || '{}').id;
          if (userId) {
            const localSocialLinks = localStorage.getItem(`social_links_${userId}`);
            if (localSocialLinks) {
              setSocialLinks(JSON.parse(localSocialLinks));
              setLoading(false);
              return;
            }
          }
          
          // Если нет данных в localStorage, используем пустые значения
          setLoading(false);
          return;
        }

        const data = await response.json();
        setSocialLinks(data);
        
        // Сохраняем данные в localStorage для резервного использования
        const userId = JSON.parse(localStorage.getItem('twitch_user') || '{}').id;
        if (userId) {
          localStorage.setItem(`social_links_${userId}`, JSON.stringify(data));
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Ошибка при получении социальных ссылок:', error);
        
        // Пробуем получить данные из localStorage
        try {
          const userId = JSON.parse(localStorage.getItem('twitch_user') || '{}').id;
          if (userId) {
            const localSocialLinks = localStorage.getItem(`social_links_${userId}`);
            if (localSocialLinks) {
              setSocialLinks(JSON.parse(localSocialLinks));
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.error('Ошибка при получении данных из localStorage:', e);
        }
        
        setError('Не удалось загрузить данные профиля');
        setLoading(false);
      }
    };

    fetchSocialLinks();
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSocialLinks((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // Сначала пробуем новый API-эндпоинт в директории app
      let response = await fetch('/api/user-socials', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('twitch_access_token')}`
        },
        body: JSON.stringify(socialLinks),
      });
      
      // Если новый API-эндпоинт недоступен, пробуем старый в директории pages
      if (!response.ok && response.status === 404) {
        console.log('Новый API-эндпоинт недоступен, пробуем старый');
        response = await fetch('/api/socials', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Cookies.get('twitch_access_token')}`
          },
          body: JSON.stringify(socialLinks),
        });
      }
      
      if (!response.ok) {
        throw new Error(`Failed to save social links: ${response.status}`);
      }
      
      // Сохраняем данные в localStorage для резервного использования
      const userId = JSON.parse(localStorage.getItem('twitch_user') || '{}').id;
      if (userId) {
        localStorage.setItem(`social_links_${userId}`, JSON.stringify(socialLinks));
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving social links:', error);
      
      // Сохраняем данные в localStorage даже при ошибке
      try {
        const userId = JSON.parse(localStorage.getItem('twitch_user') || '{}').id;
        if (userId) {
          localStorage.setItem(`social_links_${userId}`, JSON.stringify(socialLinks));
        }
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (e) {
        console.error('Ошибка при сохранении данных в localStorage:', e);
        setSaveError(true);
        setTimeout(() => setSaveError(false), 3000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.profileContainer}>
      <h1 className={styles.editProfileTitle}>Редактирование профиля</h1>
      
      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Загрузка данных профиля...</p>
        </div>
      ) : error ? (
        <div className={styles.error}>
          {error}
          <button className={styles.button} onClick={() => router.push('/auth')}>
            Вернуться на страницу авторизации
          </button>
        </div>
      ) : (
        <form className={styles.editForm} onSubmit={handleSubmit}>
          <div className={styles.formSection}>
            <h2>Описание профиля</h2>
            <div className={styles.inputGroup}>
              <label htmlFor="description">О себе:</label>
              <textarea
                id="description"
                name="description"
                className={styles.textarea}
                value={socialLinks.description}
                onChange={handleChange}
                placeholder="Расскажите о себе..."
                maxLength={500}
              />
              <div className={styles.charCount}>
                {socialLinks.description ? socialLinks.description.length : 0}/500
              </div>
            </div>
          </div>

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
                  onChange={handleChange}
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
                  onChange={handleChange}
                  placeholder="https://youtube.com/c/username"
                />
              </div>
            </div>
            
            <div className={styles.inputGroup}>
              <label htmlFor="discord">Discord сервер:</label>
              <div className={styles.inputWithIcon}>
                <span className={styles.inputIcon}>🔵</span>
                <input
                  type="text"
                  id="discord"
                  name="discord"
                  className={styles.input}
                  value={socialLinks.discord}
                  onChange={handleChange}
                  placeholder="https://discord.gg/invite"
                />
              </div>
            </div>
            
            <div className={styles.inputGroup}>
              <label htmlFor="telegram">Telegram канал:</label>
              <div className={styles.inputWithIcon}>
                <span className={styles.inputIcon}>📱</span>
                <input
                  type="text"
                  id="telegram"
                  name="telegram"
                  className={styles.input}
                  value={socialLinks.telegram}
                  onChange={handleChange}
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
                  onChange={handleChange}
                  placeholder="https://vk.com/username"
                />
              </div>
            </div>
            
            <div className={styles.checkboxGroup}>
              <input
                type="checkbox"
                id="isMusician"
                name="isMusician"
                className={styles.checkbox}
                checked={socialLinks.isMusician}
                onChange={(e) => setSocialLinks(prev => ({ ...prev, isMusician: e.target.checked }))}
              />
              <label htmlFor="isMusician">Я музыкант</label>
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
                    onChange={handleChange}
                    placeholder="https://music.yandex.ru/users/username"
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
              {submitting ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
            <button 
              type="button" 
              className={styles.button} 
              onClick={() => router.push('/profile')}
            >
              Отмена
            </button>
          </div>
          
          {saveSuccess && (
            <div className={styles.successMessage}>
              Изменения успешно сохранены!
            </div>
          )}
          
          {saveError && (
            <div className={styles.errorMessage}>
              Ошибка при сохранении изменений. Пожалуйста, попробуйте еще раз.
            </div>
          )}
        </form>
      )}
    </div>
  );
} 