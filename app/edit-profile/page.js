'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import styles from './edit-profile.module.css';
import pageStyles from '../../styles/page.module.css';
import RouteGuard from '../components/RouteGuard';
import { useTranslation } from 'react-i18next';

function EditProfilePageContent() {
  const { user, isAuthenticated, supabase } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  
  const [birthday, setBirthday] = useState('');
  const [description, setDescription] = useState('');
  const [socialLinks, setSocialLinks] = useState({});
  const [profileWidget, setProfileWidget] = useState('default');

  const [loadingProfileData, setLoadingProfileData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null); 
  const [successMessage, setSuccessMessage] = useState(null);

  const availableSocials = ['vk', 'twitch', 'discord', 'youtube', 'telegram', 'tiktok', 'boosty', 'yandex_music'];

  const fetchProfileData = useCallback(async () => {
    if (!user || !supabase) return;

    setLoadingProfileData(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('birthday, social_links, description, profile_widget')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      
      if (data) {
        setBirthday(data.birthday || '');
        setDescription(data.description || '');
        setProfileWidget(data.profile_widget || 'default');
        setSocialLinks(data.social_links || {});
      }
    } catch (err) {
      setError({ key: 'edit_profile.loadError', options: { message: err.message } });
    } finally {
      setLoadingProfileData(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchProfileData();
    }
  }, [isAuthenticated, user, fetchProfileData]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) {
      setError(t('edit_profile.userError'));
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    const nonEmptySocialLinks = Object.fromEntries(
        Object.entries(socialLinks).filter(([, value]) => value)
    );

    const profileDataToUpdate = {
      birthday: birthday || null,
      description: description || null,
      social_links: nonEmptySocialLinks,
      profile_widget: profileWidget,
    };

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error(sessionError?.message || t('edit_profile.sessionError'));
      }
      const token = session.access_token;

      const response = await fetch('/api/twitch/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(profileDataToUpdate),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Server Error: ${response.status}`);
      
      setSuccessMessage({ key: 'edit_profile.successMessage' });

      const userTwitchId = user?.user_metadata?.provider_id;
      if (userTwitchId) {
        router.replace(`/profile/${userTwitchId}`);
      } else {
        router.replace('/profile');
      }

    } catch (err) {
      setError({ key: 'edit_profile.saveError', options: { message: err.message } });
    } finally {
      setSaving(false);
    }
  };

  const handleSocialLinkChange = (platform, value) => {
    setSocialLinks(prev => ({ ...prev, [platform]: value }));
  };

  if (loadingProfileData) {
    return (
      <div className={pageStyles.loadingContainer}>
        <div className="spinner"></div><p>{t('loading.profileData')}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          &larr; {t('edit_profile.backButton')}
        </button>
        <h1>{t('edit_profile.title')}</h1>
      </div>

      {error && <div className={styles.errorMessage}>{t(error.key, error.options)}</div>}
      {successMessage && <div className={styles.successMessage}>{t(successMessage.key)}</div>}

      <form onSubmit={handleSave} className={styles.form}>
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>{t('edit_profile.customization')}</legend>
          <div className={styles.formGroup}>
            <label htmlFor="profileWidget" className={styles.label}>{t('edit_profile.widgetLabel')}</label>
            <select
              id="profileWidget"
              value={profileWidget}
              onChange={(e) => setProfileWidget(e.target.value)}
              className={styles.select}
            >
              <option value="default">{t('edit_profile.widgetDefault')}</option>
              <option value="statistics">{t('edit_profile.widgetStatistics')}</option>
            </select>
          </div>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>{t('edit_profile.basicInfo')}</legend>
          <div className={styles.formGroup}>
            <label htmlFor="birthday" className={styles.label}>{t('edit_profile.birthdayLabel')}</label>
            <input
              type="date"
              id="birthday"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.label}>{t('edit_profile.bioLabel')}</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={styles.textarea}
              rows="5"
              placeholder={t('edit_profile.bioPlaceholder')}
            />
          </div>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>{t('edit_profile.socials')}</legend>
          {availableSocials.map(social => (
            <div className={styles.formGroup} key={social}>
              <label htmlFor={`${social}Link`} className={styles.label}>{social.charAt(0).toUpperCase() + social.slice(1)}:</label>
              <input
                type="text"
                id={`${social}Link`}
                value={socialLinks[social] || ''}
                onChange={(e) => handleSocialLinkChange(social, e.target.value)}
                className={styles.input}
                placeholder={t(`edit_profile.socialsPlaceholder.${social}`, { defaultValue: `https://...` })}
              />
            </div>
          ))}
        </fieldset>

        <div className={styles.buttonGroup}>
          <button
            type="submit"
            className={styles.saveButton}
            disabled={saving || loadingProfileData}
          >
            {saving ? t('edit_profile.savingButton') : t('edit_profile.saveButton')}
          </button>
        </div>
      </form>
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