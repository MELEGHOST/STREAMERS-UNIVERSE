'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './edit-profile.module.css';
import Cookies from 'js-cookie';
import NeonCheckbox from '../components/NeonCheckbox';
import { DataStorage } from '../utils/dataStorage';

export default function EditProfile() {
  const [editData, setEditData] = useState({
    description: '',
    twitch: '',
    youtube: '',
    discord: '',
    telegram: '',
    vk: '',
    yandexMusic: '',
    isMusician: false,
    birthday: '',
    showBirthday: true,
    statsVisibility: {
      followers: true,
      followings: true,
      streams: true,
      channel: true,
      accountInfo: true
    }
  });

  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        const userData = await DataStorage.getData('user');
        if (!userData || !userData.id) {
          console.log('EditProfile: User not found, redirecting to login.');
          router.push('/login');
          return;
        }
        setUserId(userData.id);

        console.log('EditProfile: Fetching editable data for user:', userData.id);
        const response = await fetch(`/api/user-profile-data?userId=${userData.id}&_=${Date.now()}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch profile data: ${response.status}`);
        }

        const data = await response.json();
        console.log('EditProfile: Received data:', data);

        setEditData({
            description: data.description || '',
            twitch: data.socialLinks?.twitch || '',
            youtube: data.socialLinks?.youtube || '',
            discord: data.socialLinks?.discord || '',
            telegram: data.socialLinks?.telegram || '',
            vk: data.socialLinks?.vk || '',
            yandexMusic: data.socialLinks?.yandexMusic || '',
            isMusician: data.socialLinks?.isMusician || false,
            birthday: data.birthday || '',
            showBirthday: data.showBirthday !== undefined ? data.showBirthday : true,
            statsVisibility: data.statsVisibility || {
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
    };

    loadInitialData();
  }, [router]);

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
        } else {
             return {
                 ...prev,
                 [name]: value
             };
        }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSaveSuccess(false);
    setSaveError(null);

    if (!userId) {
        setSaveError('Ошибка: ID пользователя не найден.');
        setSubmitting(false);
        return;
    }

    try {
      console.log('EditProfile: Submitting data for user:', userId, editData);
      const response = await fetch('/api/user-profile-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: userId,
          ...editData
        })
      });

      if (!response.ok) {
        let errorMessage = 'Не удалось сохранить данные на сервере.';
        try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
        }
        console.warn('Server save failed:', response.status, errorMessage);
        throw new Error(errorMessage);
      }

      console.log('EditProfile: Data saved successfully on server.');
      try {
          const currentUserData = await DataStorage.getData('user');
          if (currentUserData) {
              await DataStorage.saveData('user', { ...currentUserData, /* обновленные поля */ });
              console.log('DataStorage updated.');
          }
      } catch (storageError) {
          console.warn('Failed to update DataStorage after save:', storageError);
      }

      setSaveSuccess(true);

      setTimeout(() => {
        router.push('/profile');
      }, 1500);

    } catch (error) {
      console.error('Error submitting profile data:', error);
      setSaveError(error.message || 'Произошла неизвестная ошибка при сохранении.');
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
          <button className={styles.button} onClick={() => window.location.reload()}>
            Обновить страницу
          </button>
          <button className={styles.button} onClick={() => router.push('/menu')}>
            Вернуться в меню
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
                value={editData.description}
                onChange={handleInputChange}
                placeholder="Расскажите о себе..."
                maxLength={500}
              />
              <div className={styles.charCount}>
                {editData.description.length}/500
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
              />
              <p className={styles.birthdayNote}>
                В день рождения вы получите 100 стример-коинов в подарок! 🎁
              </p>
            </div>
            <div className={styles.checkboxGroup}>
              <NeonCheckbox
                label="Показывать день рождения другим пользователям"
                checked={editData.showBirthday}
                onChange={handleInputChange}
                name="showBirthday"
              />
            </div>
          </div>
          
          <div className={styles.formSection}>
            <h2>Настройки видимости статистики</h2>
            <p className={styles.sectionDescription}>
              Выберите, какую информацию вы хотите отображать в своем профиле:
            </p>
            
            <div className={styles.checkboxGrid}>
              <div className={styles.checkboxGroup}>
                <NeonCheckbox
                  label="Подписчики"
                  checked={editData.statsVisibility.followers}
                  onChange={handleInputChange}
                  name="statsVisibility.followers"
                />
              </div>
              
              <div className={styles.checkboxGroup}>
                <NeonCheckbox
                  label="Подписки"
                  checked={editData.statsVisibility.followings}
                  onChange={handleInputChange}
                  name="statsVisibility.followings"
                />
              </div>
              
              <div className={styles.checkboxGroup}>
                <NeonCheckbox
                  label="Стримы"
                  checked={editData.statsVisibility.streams}
                  onChange={handleInputChange}
                  name="statsVisibility.streams"
                />
              </div>
              
              <div className={styles.checkboxGroup}>
                <NeonCheckbox
                  label="Информация о канале"
                  checked={editData.statsVisibility.channel}
                  onChange={handleInputChange}
                  name="statsVisibility.channel"
                />
              </div>
              
              <div className={styles.checkboxGroup}>
                <NeonCheckbox
                  label="Информация об аккаунте"
                  checked={editData.statsVisibility.accountInfo}
                  onChange={handleInputChange}
                  name="statsVisibility.accountInfo"
                />
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
                  value={editData.twitch}
                  onChange={handleInputChange}
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
                  value={editData.youtube}
                  onChange={handleInputChange}
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
                  value={editData.discord}
                  onChange={handleInputChange}
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
                  value={editData.telegram}
                  onChange={handleInputChange}
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
                  value={editData.vk}
                  onChange={handleInputChange}
                  placeholder="https://vk.com/username"
                />
              </div>
            </div>
            
            <div className={styles.checkboxGroup}>
              <NeonCheckbox
                label="Я музыкант"
                checked={editData.isMusician}
                onChange={handleInputChange}
                name="isMusician"
              />
            </div>
            
            {editData.isMusician && (
              <div className={styles.inputGroup}>
                <label htmlFor="yandexMusic">Яндекс Музыка:</label>
                <div className={styles.inputWithIcon}>
                  <span className={styles.inputIcon}>🎵</span>
                  <input
                    type="text"
                    id="yandexMusic"
                    name="yandexMusic"
                    className={styles.input}
                    value={editData.yandexMusic}
                    onChange={handleInputChange}
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