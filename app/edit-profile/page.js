'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import styles from './EditProfile.module.css';
import Footer from '../components/Footer';
import { supabase } from '../../lib/supabaseClient';
import SocialButton from '../components/SocialButton';
import NeonCheckbox from '../components/NeonCheckbox';
import AchievementsSystem from '../components/AchievementsSystem';
import { DataStorage } from '../utils/dataStorage';

function EditProfileContent() {
  const [editData, setEditData] = useState({
    description: '',
    birthday: '',
    showBirthday: true,
    twitch: '',
    youtube: '',
    discord: '',
    telegram: '',
    vk: '',
    yandexMusic: '',
    isMusician: false,
    statsVisibility: {
      followers: true,
      followings: true,
      streams: true,
      channel: true,
      accountInfo: true
    }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('EditProfile: Fetching editable data...');
      const response = await fetch(`/api/user-profile-data?_=${Date.now()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        credentials: 'include',
      });

      if (response.status === 401) {
        console.log('EditProfile: Not authenticated, redirecting to login.');
        router.push('/login?reason=unauthenticated');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch profile data: ${response.status}`);
      }

      const data = await response.json();
      console.log('EditProfile: Received data:', data);

      setEditData({
        description: data.description || '',
        birthday: data.birthday ? data.birthday.split('T')[0] : '',
        showBirthday: data.show_birthday !== undefined ? data.show_birthday : true,
        twitch: data.social_links?.twitch || '',
        youtube: data.social_links?.youtube || '',
        discord: data.social_links?.discord || '',
        telegram: data.social_links?.telegram || '',
        vk: data.social_links?.vk || '',
        yandexMusic: data.social_links?.yandexMusic || '',
        isMusician: data.social_links?.isMusician || false,
        statsVisibility: data.stats_visibility || {
          followers: true,
          followings: true,
          streams: true,
          channel: true,
          accountInfo: true
        }
      });

    } catch (err) {
      console.error('Error loading initial data for edit profile:', err);
      setError(err.message || 'Не удалось загрузить данные для редактирования. Попробуйте обновить страницу.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const keys = name.split('.');

    setEditData(prev => {
      if (keys.length === 1) {
        return { ...prev, [name]: type === 'checkbox' ? checked : value };
      } else if (keys.length === 2 && keys[0] === 'statsVisibility') {
        return {
          ...prev,
          statsVisibility: {
            ...prev.statsVisibility,
            [keys[1]]: checked
          }
        };
      }
      return prev;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      console.log('EditProfile: Submitting data:', editData);
      const response = await fetch('/api/user-profile-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(editData)
      });

      if (!response.ok) {
        let errorMessage = 'Не удалось сохранить данные.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (_) {
          errorMessage = `Ошибка сервера: ${response.status}`;
        }
        console.warn('Server save failed:', response.status, errorMessage);
        throw new Error(errorMessage);
      }

      console.log('EditProfile: Data saved successfully on server.');
      
      try {
        const currentUserData = await DataStorage.getData('user');
        if (currentUserData) {
          const updatedUserData = {
            ...currentUserData,
            description: editData.description
          };
          await DataStorage.saveData('user', updatedUserData);
          console.log('DataStorage user data partially updated (description).');
        }
      } catch (storageError) {
        console.warn('Failed to update DataStorage after save:', storageError);
      }

      setSaveSuccess(true);
      setError(null);

      setTimeout(() => {
        router.push('/profile?refresh=true');
      }, 1500);

    } catch (error) {
      console.error('Error submitting profile data:', error);
      setSaveError(error.message || 'Произошла неизвестная ошибка при сохранении.');
      setSaveSuccess(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Отладочный лог перед рендерингом
  console.log('EditProfile RENDERING with state:', { 
    loading, 
    error, 
    submitting, 
    saveSuccess, 
    saveError, 
    editData 
  });

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
          <button className={styles.button} onClick={loadInitialData}>
            Попробовать снова
          </button>
          <button className={styles.button} onClick={() => router.push('/menu')}>
            Вернуться в меню
          </button>
        </div>
      ) : (
        <form className={styles.editForm} onSubmit={handleSubmit}>
          {saveSuccess && (
            <div className={styles.successMessage}>
              Профиль успешно сохранен! Перенаправление...
            </div>
          )}
          {saveError && (
            <div className={styles.errorMessage}>
              Ошибка сохранения: {saveError}
            </div>
          )}

          <div className={styles.formSection}>
            <h2>Описание профиля</h2>
            <div className={styles.inputGroup}>
              <label htmlFor="description">О себе:</label>
              <textarea
                id="description"
                name="description"
                className={styles.textarea}
                value={editData.description}
                onChange={handleInputChange}
                placeholder="Расскажите о себе..."
                maxLength={500}
                disabled={submitting}
              />
              <div className={styles.charCount}>
                {editData.description?.length || 0}/500
              </div>
            </div>
          </div>
          
          <div className={styles.formSection}>
            <h2>День рождения</h2>
            <div className={styles.inputGroup}>
              <label htmlFor="birthday">Дата рождения:</label>
              <input
                type="date"
                id="birthday"
                name="birthday"
                className={styles.input}
                value={editData.birthday}
                onChange={handleInputChange}
                disabled={submitting}
              />
              <p className={styles.birthdayNote}>
                В день рождения вы получите 100 стример-коинов в подарок! 🎁
              </p>
            </div>
            <div className={styles.checkboxGroup}>
              <NeonCheckbox
                label="Показывать дату рождения другим"
                id="showBirthday"
                name="showBirthday"
                checked={editData.showBirthday}
                onChange={handleInputChange}
                disabled={submitting}
              />
            </div>
          </div>
          
          <div className={styles.formSection}>
            <h2>Социальные сети</h2>
            <div className={styles.inputGroup}>
              <label htmlFor="twitch">Twitch:</label>
              <input type="url" id="twitch" name="twitch" value={editData.twitch} onChange={handleInputChange} placeholder="https://twitch.tv/yourchannel" className={styles.input} disabled={submitting} />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="youtube">YouTube:</label>
              <input type="url" id="youtube" name="youtube" value={editData.youtube} onChange={handleInputChange} placeholder="https://youtube.com/c/yourchannel" className={styles.input} disabled={submitting} />
            </div>
             <div className={styles.inputGroup}>
              <label htmlFor="discord">Discord (ссылка на сервер или профиль):</label>
              <input type="url" id="discord" name="discord" value={editData.discord} onChange={handleInputChange} placeholder="https://discord.gg/yourserver" className={styles.input} disabled={submitting} />
            </div>
             <div className={styles.inputGroup}>
              <label htmlFor="telegram">Telegram (канал или профиль):</label>
              <input type="url" id="telegram" name="telegram" value={editData.telegram} onChange={handleInputChange} placeholder="https://t.me/yourchannel" className={styles.input} disabled={submitting} />
            </div>
             <div className={styles.inputGroup}>
              <label htmlFor="vk">VK:</label>
              <input type="url" id="vk" name="vk" value={editData.vk} onChange={handleInputChange} placeholder="https://vk.com/yourgroup" className={styles.input} disabled={submitting} />
            </div>
            <div className={styles.checkboxGroup}>
               <NeonCheckbox
                label="Я музыкант"
                id="isMusician"
                name="isMusician"
                checked={editData.isMusician}
                onChange={handleInputChange}
                disabled={submitting}
              />
            </div>
            {editData.isMusician && (
                 <div className={styles.inputGroup}>
                  <label htmlFor="yandexMusic">Яндекс Музыка:</label>
                  <input type="url" id="yandexMusic" name="yandexMusic" value={editData.yandexMusic} onChange={handleInputChange} placeholder="https://music.yandex.ru/artist/yourartist" className={styles.input} disabled={submitting} />
                </div>
            )}
          </div>
          
          <div className={styles.formSection}>
            <h2>Настройки видимости статистики</h2>
            <p className={styles.visibilityNote}>Выберите, какие разделы статистики будут видны другим пользователям на вашей странице профиля.</p>
            <div className={styles.checkboxGrid}> 
              <NeonCheckbox label="Подписчики" id="statsVisibility.followers" name="statsVisibility.followers" checked={editData.statsVisibility.followers} onChange={handleInputChange} disabled={submitting}/>
              <NeonCheckbox label="Подписки" id="statsVisibility.followings" name="statsVisibility.followings" checked={editData.statsVisibility.followings} onChange={handleInputChange} disabled={submitting}/>
            </div>
          </div>
          
          <div className={styles.formActions}>
            <button type="submit" className={styles.saveButton} disabled={submitting || loading}> 
              {submitting ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
            <button type="button" className={styles.cancelButton} onClick={() => router.push('/profile')} disabled={submitting}>
              Отмена
            </button>
          </div>
        </form>
      )}
      <Footer />
    </div>
  );
}

export default function EditProfile() {
  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <EditProfileContent />
    </Suspense>
  );
} 