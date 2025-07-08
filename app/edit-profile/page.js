'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import I18nProvider from '../components/I18nProvider';
import styles from './edit-profile.module.css';
import RouteGuard from '../components/RouteGuard';

function EditProfilePageContent() {
    const { user, isAuthenticated } = useAuth();
    const router = useRouter();
    const { t } = useTranslation();

    const [displayName, setDisplayName] = useState('');
    const [description, setDescription] = useState('');
    const [socialLinks, setSocialLinks] = useState({});
    const [profileWidget, setProfileWidget] = useState('statistics');
    
    const [loadingProfileData, setLoadingProfileData] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const fetchProfileData = useCallback(async () => {
        if (!user) return;
        setLoadingProfileData(true);
        try {
            const { data, error: fetchError } = await supabase
                .from('user_profiles')
                .select('twitch_display_name, social_links, description, profile_widget')
                .eq('user_id', user.id)
                .maybeSingle();

            if (fetchError) throw fetchError;

            if (data) {
                setDisplayName(data.twitch_display_name || user.user_metadata?.name || user.user_metadata?.user_name || '');
                setDescription(data.description || '');
                setProfileWidget(data.profile_widget || 'statistics');
                setSocialLinks(data.social_links || {});
            } else {
                setDisplayName(user.user_metadata?.name || user.user_metadata?.user_name || '');
            }
        } catch (err) {
            setError({ key: 'edit_profile.loadError', options: { message: err.message } });
        } finally {
            setLoadingProfileData(false);
        }
    }, [user]);

    useEffect(() => {
        if (isAuthenticated) {
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
          Object.entries(socialLinks).filter(([, value]) => value.trim() !== '')
      );
  
      const profileDataToUpdate = {
        twitch_display_name: displayName,
        description: description || null,
        social_links: nonEmptySocialLinks,
        profile_widget: profileWidget,
        updated_at: new Date(),
      };
  
      try {
        const { error: updateError } = await supabase
            .from('user_profiles')
            .update(profileDataToUpdate)
            .eq('user_id', user.id);

        if (updateError) throw updateError;
        
        setSuccessMessage({ key: 'edit_profile.successMessage' });
  
        setTimeout(() => {
            const userTwitchId = user?.user_metadata?.provider_id;
            if (userTwitchId) {
                router.push(`/profile/${userTwitchId}`);
            } else {
                router.push('/profile');
            }
        }, 1000);
  
      } catch (err) {
        setError({ key: 'edit_profile.saveError', options: { message: err.message } });
      } finally {
        setSaving(false);
      }
    };
    
    const handleSocialLinkChange = (platform, value) => {
        setSocialLinks(prev => ({ ...prev, [platform]: value }));
    };

    const formatPlatformName = (platform) => {
        if (platform === 'yandexMusic') return 'Yandex Music';
        if (platform === 'vk') return 'VK';
        return platform.charAt(0).toUpperCase() + platform.slice(1);
    };

    const handleBack = () => {
        router.back();
    };

    if (loadingProfileData) {
        return <div className={styles.loadingContainer}><p>Загрузка профиля...</p></div>;
    }

    return (
        <div className={styles.container}>
            <button onClick={handleBack} className={styles.backButton}>
                &larr; {t('profile.back')}
            </button>
            <h1 className={styles.title}>{t('profile.edit.title')}</h1>
            <form onSubmit={handleSave} className={styles.form}>
                <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="displayName">{t('profile.edit.displayName')}</label>
                    <input id="displayName" type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="description">{t('profile.edit.description')}</label>
                    <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} className={styles.textarea}></textarea>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="profileWidget">{t('profile.edit.widgetLabel')}</label>
                    <select id="profileWidget" value={profileWidget} onChange={e => setProfileWidget(e.target.value)} className={styles.select}>
                        <option value="statistics">{t('profile.edit.widgetStatistics')}</option>
                        <option value="achievements">{t('profile.edit.widgetAchievements')}</option>
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>{t('profile.edit.socialLinks')}</label>
                    <div className={styles.socialLinksContainer}>
                        {['twitch', 'youtube', 'telegram', 'discord', 'vk', 'tiktok', 'yandexMusic', 'boosty'].map(platform => (
                            <div key={platform} className={styles.socialLinkItem}>
                                <label className={styles.socialLinkLabel} htmlFor={platform}>{formatPlatformName(platform)}</label>
                                <input
                                    id={platform}
                                    type="text"
                                    value={socialLinks[platform] || ''}
                                    onChange={e => handleSocialLinkChange(platform, e.target.value)}
                                    className={styles.input}
                                    placeholder={t(`edit_profile.socialsPlaceholder.${platform}`)}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {error && <p className={styles.errorMessage}>{t(error.key, error.options)}</p>}
                {successMessage && <p className={styles.successMessage}>{t(successMessage.key)}</p>}
                
                <button type="submit" className={styles.saveButton} disabled={saving}>
                    {saving ? t('profile.edit.saving') : t('profile.save')}
                </button>
            </form>
        </div>
    );
}

function EditProfilePage() {
    return (
        <RouteGuard>
            <I18nProvider>
                <EditProfilePageContent />
            </I18nProvider>
        </RouteGuard>
    );
}

export default EditProfilePage; 