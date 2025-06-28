'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import styles from './edit-profile.module.css';
import pageStyles from '../../styles/page.module.css';
import RouteGuard from '../components/RouteGuard';

function EditProfilePageContent() {
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
  const [profileWidget, setProfileWidget] = useState('default');

  const [telegramLink, setTelegramLink] = useState('');

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
        .select('birthday, social_links, description, profile_widget')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        console.log(`[${title}] Данные профиля загружены:`, data);
        setBirthday(data.birthday || '');
        setDescription(data.description || '');
        setProfileWidget(data.profile_widget || 'default');

        if (data.social_links && typeof data.social_links === 'object') {
          const links = data.social_links;
          setVkLink(links.vk || '');
          setTwitchLink(links.twitch || '');
          setDiscordLink(links.discord || '');
          setYoutubeLink(links.youtube || '');
          setTelegramLink(links.telegram || '');
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
          setTelegramLink('');
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
    if (!user) {
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
      telegram: telegramLink || null,
      yandex_music: isMusician && yandexMusicLink ? yandexMusicLink : null,
    };
    
    const profileDataToUpdate = {
      birthday: birthday || null,
      description: description || null,
      social_links: socialLinksData,
      profile_widget: profileWidget,
    };

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error(sessionError?.message || "Не удалось получить сессию или токен для сохранения.");
      }
      const token = session.access_token;

      console.log(`[${title}] Отправка данных на /api/twitch/user/profile:`, profileDataToUpdate);

      const response = await fetch('/api/twitch/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileDataToUpdate),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error(`[${title}] Ошибка от API (${response.status}):`, result.error);
        throw new Error(result.error || `Ошибка сервера: ${response.status}`);
      }

      console.log(`[${title}] Данные профиля успешно сохранены через API. Ответ:`, result);
      setSuccessMessage(result.message || 'Профиль успешно обновлен!');

      const userTwitchId = user?.user_metadata?.provider_id;
      if (userTwitchId) {
        console.log(`[${title}] Перенаправляем на профиль /profile/${userTwitchId} через router.replace...`);
        router.replace(`/profile/${userTwitchId}`);
      } else {
        console.warn(`[${title}] Не удалось получить Twitch ID пользователя (${user?.id}) для редиректа.`);
      }

    } catch (err) {
      console.error(`[${title}] Ошибка сохранения данных профиля:`, err);
      setError('Не удалось сохранить данные профиля. Ошибка: ' + (err.message || 'Неизвестная ошибка'));
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
          <legend className={styles.legend}>Кастомизация профиля</legend>
          <div className={styles.formGroup}>
            <label htmlFor="profileWidget" className={styles.label}>Виджет на странице профиля:</label>
            <select
              id="profileWidget"
              value={profileWidget}
              onChange={(e) => setProfileWidget(e.target.value)}
              className={styles.select}
            >
              <option value="default">По умолчанию</option>
              <option value="statistics">Статистика</option>
            </select>
          </div>
        </fieldset>

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

          <div className={styles.formGroup}>
            <label htmlFor="telegramLink" className={styles.label}>Telegram:</label>
            <input
              type="text"
              id="telegramLink"
              value={telegramLink}
              onChange={(e) => setTelegramLink(e.target.value)}
              className={styles.input}
              placeholder="@username или https://t.me/username"
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
      <button onClick={() => user ? router.push(`/profile/${user.user_metadata?.provider_id}`) : router.push('/menu')} className={pageStyles.backButton} style={{ marginTop: '2rem' }}>
         &larr; Назад в профиль
      </button>
    </div>
  );
}

export default function EditProfilePage() {
  return (
    <RouteGuard>
      <EditProfilePageContent />
    </RouteGuard>
  );
}