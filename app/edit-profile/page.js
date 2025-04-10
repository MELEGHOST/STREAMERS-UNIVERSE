'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import styles from './edit-profile.module.css';
import pageStyles from '../../styles/page.module.css';

export default function EditProfilePage() {
  const { user, isLoading, isAuthenticated, supabase } = useAuth();
  const router = useRouter();
  const title = "Редактирование профиля";

  const [birthday, setBirthday] = useState('');
  const [description, setDescription] = useState('');

  const [vkLink, setVkLink] = useState('');
  const [twitchLink, setTwitchLink] = useState('');
  const [discordLink, setDiscordLink] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [yandexMusicLink, setYandexMusicLink] = useState('');
  const [isMusician, setIsMusician] = useState(false);

  const [loadingProfileData, setLoadingProfileData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const fetchProfileData = useCallback(async () => {
    if (!user || !supabase) return;

    setLoadingProfileData(true);
    setError(null);
    setSuccessMessage(null);
    console.log(`[${title}] Загрузка данных профиля для user_id: ${user.id}`);

    try {
      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('birthday, social_links, description')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        console.log(`[${title}] Данные профиля загружены:`, data);
        setBirthday(data.birthday || '');
        setDescription(data.description || '');

        if (data.social_links && typeof data.social_links === 'object') {
          const links = data.social_links;
          setVkLink(links.vk || '');
          setTwitchLink(links.twitch || '');
          setDiscordLink(links.discord || '');
          setYoutubeLink(links.youtube || '');
          if (links.yandex_music) {
            setYandexMusicLink(links.yandex_music);
            setIsMusician(true);
          } else {
            setYandexMusicLink('');
            setIsMusician(false);
          }
        } else {
          setVkLink('');
          setTwitchLink('');
          setDiscordLink('');
          setYoutubeLink('');
          setYandexMusicLink('');
          setIsMusician(false);
        }
      } else {
        console.log(`[${title}] Профиль для user_id ${user.id} еще не создан.`);
      }
    } catch (err) {
      console.error(`[${title}] Ошибка загрузки данных профиля:`, err);
      setError('Не удалось загрузить данные профиля. Ошибка: ' + err.message);
    } finally {
      setLoadingProfileData(false);
    }
  }, [user, supabase, title]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log(`[${title}] Не аутентифицирован, редирект на /auth`);
      router.push(`/auth?next=/edit-profile`);
    } else if (isAuthenticated && user) {
      fetchProfileData();
    } else if (!isLoading && isAuthenticated && !user) {
      console.error(`[${title}] Пользователь аутентифицирован, но объект user отсутствует!`);
      setError("Произошла ошибка аутентификации. Попробуйте перезайти.");
      setLoadingProfileData(false);
    }
  }, [isLoading, isAuthenticated, user, router, title, fetchProfileData]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user || !supabase) {
      setError("Не удалось получить данные пользователя для сохранения.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    console.log(`[${title}] Сохранение данных профиля для user_id: ${user.id}`);

    const socialLinksData = {
      vk: vkLink || null,
      twitch: twitchLink || null,
      discord: discordLink || null,
      youtube: youtubeLink || null,
      yandex_music: isMusician && yandexMusicLink ? yandexMusicLink : null,
    };
    
    Object.keys(socialLinksData).forEach(key => {
      if (socialLinksData[key] === null) {
        delete socialLinksData[key];
      }
    });

    const profileDataToSave = {
      user_id: user.id,
      birthday: birthday || null,
      description: description || null,
      social_links: Object.keys(socialLinksData).length > 0 ? socialLinksData : null,
      updated_at: new Date().toISOString(),
    };

    try {
      const { error: saveError } = await supabase
        .from('user_profiles')
        .upsert(profileDataToSave, { onConflict: 'user_id' });

      if (saveError) {
        throw saveError;
      }

      console.log(`[${title}] Данные профиля успешно сохранены.`);
      setSuccessMessage('Профиль успешно обновлен!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error(`[${title}] Ошибка сохранения данных профиля:`, err);
      setError('Не удалось сохранить данные профиля. Ошибка: ' + err.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || loadingProfileData) {
    return (
      <div className={pageStyles.loadingContainer}>
        <div className="spinner"></div><p>Загрузка редактора профиля...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{title}</h1>

      {error && <div className={styles.errorMessage}>{error}</div>}
      {successMessage && <div className={styles.successMessage}>{successMessage}</div>}

      <form onSubmit={handleSave} className={styles.form}>
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Основная информация</legend>
          <div className={styles.formGroup}>
            <label htmlFor="birthday" className={styles.label}>Дата рождения:</label>
            <input
              type="date"
              id="birthday"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.label}>Описание профиля:</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={styles.textarea}
              rows="5"
              placeholder="Расскажите о себе..."
            />
          </div>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Социальные сети</legend>
          
          <div className={styles.formGroup}>
            <label htmlFor="vkLink" className={styles.label}>VK:</label>
            <input
              type="url"
              id="vkLink"
              value={vkLink}
              onChange={(e) => setVkLink(e.target.value)}
              className={styles.input}
              placeholder="https://vk.com/your_id"
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="twitchLink" className={styles.label}>Twitch:</label>
            <input
              type="url"
              id="twitchLink"
              value={twitchLink}
              onChange={(e) => setTwitchLink(e.target.value)}
              className={styles.input}
              placeholder="https://twitch.tv/your_channel"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="discordLink" className={styles.label}>Discord:</label>
            <input
              type="text"
              id="discordLink"
              value={discordLink}
              onChange={(e) => setDiscordLink(e.target.value)}
              className={styles.input}
              placeholder="username#1234 или ссылка на сервер"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="youtubeLink" className={styles.label}>YouTube:</label>
            <input
              type="url"
              id="youtubeLink"
              value={youtubeLink}
              onChange={(e) => setYoutubeLink(e.target.value)}
              className={styles.input}
              placeholder="https://youtube.com/channel/your_channel"
            />
          </div>
          
          <div className={styles.formGroupRow}>
            <div className={styles.checkboxGroup}>
              <input
                type="checkbox"
                id="isMusician"
                checked={isMusician}
                onChange={(e) => setIsMusician(e.target.checked)}
                className={styles.checkbox}
              />
              <label htmlFor="isMusician" className={styles.checkboxLabel}>Я музыкант (Яндекс Музыка)</label>
            </div>
            <div className={`${styles.formGroup} ${styles.yandexInputGroup}`}>
              <label htmlFor="yandexMusicLink" className={`${styles.label} ${styles.srOnly}`}>Ссылка Яндекс Музыка:</label>
              <input
                type="url"
                id="yandexMusicLink"
                value={yandexMusicLink}
                onChange={(e) => setYandexMusicLink(e.target.value)}
                className={styles.input}
                placeholder="Ссылка на профиль/карточку"
                disabled={!isMusician}
              />
            </div>
          </div>
          
        </fieldset>

        <div className={styles.buttonGroup}>
          <button
            type="submit"
            className={styles.saveButton}
            disabled={saving || loadingProfileData}
          >
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>
      </form>
      <button onClick={() => router.push('/profile')} className={pageStyles.backButton} style={{ marginTop: '2rem' }}>
        &larr; Назад в профиль
      </button>
    </div>
  );
} 