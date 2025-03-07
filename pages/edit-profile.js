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

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (error) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.error}>
          {error}
          <button className={styles.button} onClick={() => router.push('/auth')}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.profileContainer}>
      <h1>Редактирование профиля</h1>
      <form onSubmit={handleSubmit} className={styles.editForm}>
        <div className={styles.formSection}>
          <h2>Описание профиля</h2>
          <textarea
            name="description"
            value={socialLinks.description}
            onChange={handleChange}
            placeholder="Расскажите о себе"
            className={styles.textarea}
          />
        </div>

        <div className={styles.formSection}>
          <h2>Социальные сети</h2>
          
          <div className={styles.inputGroup}>
            <label htmlFor="twitch">Twitch</label>
            <input
              type="text"
              id="twitch"
              name="twitch"
              value={socialLinks.twitch}
              onChange={handleChange}
              placeholder="https://twitch.tv/ваш_канал"
              className={styles.input}
            />
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor="youtube">YouTube</label>
            <input
              type="text"
              id="youtube"
              name="youtube"
              value={socialLinks.youtube}
              onChange={handleChange}
              placeholder="https://youtube.com/c/ваш_канал"
              className={styles.input}
            />
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor="discord">Discord сервер</label>
            <input
              type="text"
              id="discord"
              name="discord"
              value={socialLinks.discord}
              onChange={handleChange}
              placeholder="https://discord.gg/ваш_сервер"
              className={styles.input}
            />
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor="telegram">Telegram канал</label>
            <input
              type="text"
              id="telegram"
              name="telegram"
              value={socialLinks.telegram}
              onChange={handleChange}
              placeholder="https://t.me/ваш_канал"
              className={styles.input}
            />
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor="vk">Группа ВКонтакте</label>
            <input
              type="text"
              id="vk"
              name="vk"
              value={socialLinks.vk}
              onChange={handleChange}
              placeholder="https://vk.com/ваша_группа"
              className={styles.input}
            />
          </div>
          
          <div className={styles.inputGroup}>
            <div className={styles.checkboxGroup}>
              <input
                type="checkbox"
                id="isMusician"
                name="isMusician"
                checked={socialLinks.isMusician}
                onChange={(e) => setSocialLinks(prev => ({ ...prev, isMusician: e.target.checked }))}
                className={styles.checkbox}
              />
              <label htmlFor="isMusician">Я музыкант</label>
            </div>
          </div>
          
          {socialLinks.isMusician && (
            <div className={styles.inputGroup}>
              <label htmlFor="yandexMusic">Яндекс Музыка (карточка музыканта)</label>
              <input
                type="text"
                id="yandexMusic"
                name="yandexMusic"
                value={socialLinks.yandexMusic}
                onChange={handleChange}
                placeholder="https://music.yandex.ru/artist/ваш_id"
                className={styles.input}
              />
            </div>
          )}
        </div>
        
        <div className={styles.buttonGroup}>
          <button type="submit" className={styles.button}>
            Сохранить изменения
          </button>
          <button type="button" className={styles.button} onClick={() => router.push('/profile')}>
            Вернуться к профилю
          </button>
        </div>
      </form>
    </div>
  );
} 