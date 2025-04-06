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
  const [socialLinks, setSocialLinks] = useState('');
  const [description, setDescription] = useState('');

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
        try {
            const linksString = data.social_links ? JSON.stringify(data.social_links, null, 2) : '';
            setSocialLinks(linksString);
        } catch (e) {
             console.warn(`[${title}] Ошибка stringify social_links:`, e);
             setSocialLinks(typeof data.social_links === 'string' ? data.social_links : '');
        }
        setDescription(data.description || '');
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

    let parsedSocialLinks = null;
    if (socialLinks) {
        try {
            parsedSocialLinks = JSON.parse(socialLinks);
            if (typeof parsedSocialLinks !== 'object' || parsedSocialLinks === null) {
                 console.warn(`[${title}] social_links распарсился, но не является объектом. Сохраняем как null.`);
                 parsedSocialLinks = null;
            }
        } catch (e) {
            console.warn(`[${title}] Не удалось распарсить social_links как JSON. Сохраняем как null. Ошибка: ${e.message}`);
            parsedSocialLinks = null;
        }
    }

    const profileData = {
      user_id: user.id,
      birthday: birthday || null,
      social_links: parsedSocialLinks || null,
      description: description || null,
      updated_at: new Date().toISOString(),
    };

    try {
      const { error: saveError } = await supabase
        .from('user_profiles')
        .upsert(profileData, { onConflict: 'user_id' });

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
          <label htmlFor="socialLinks" className={styles.label}>Ссылки на соцсети:</label>
          <textarea
            id="socialLinks"
            value={socialLinks}
            onChange={(e) => setSocialLinks(e.target.value)}
            className={styles.textarea}
            rows="3"
            placeholder="https://t.me/username
https://vk.com/id123..."
          />
          <p className={styles.hint}>Каждую ссылку с новой строки (пока что).</p>
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
      <button onClick={() => router.push('/profile')} className={pageStyles.backButton} style={{ marginTop: '1rem' }}>
        &larr; Назад в профиль
      </button>
    </div>
  );
} 