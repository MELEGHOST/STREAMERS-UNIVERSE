'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import I18nProvider from '../components/I18nProvider';
import styles from './edit-profile.module.css';
import RouteGuard from '../components/RouteGuard';
// Improved sanitizer (simplified, recommend using DOMPurify in production)
function simpleSanitize(input) {
  return input.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '')
              .replace(/<img[^>]*>/gmi, '')
              .replace(/on\w+="[^"]*"/gmi, '');
}

function EditProfilePageContent() {
    const { user, isAuthenticated } = useAuth();
    const router = useRouter();
    const { t } = useTranslation();

    const [description, setDescription] = useState('');
    const [socialLinks, setSocialLinks] = useState({});
    const [profileWidget, setProfileWidget] = useState('statistics');
    const [birthday, setBirthday] = useState('');
    
    const [loadingProfileData, setLoadingProfileData] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [tempWidget, setTempWidget] = useState(profileWidget);
    const [originalDescription, setOriginalDescription] = useState('');
    const [originalSocialLinks, setOriginalSocialLinks] = useState({});
    const [originalProfileWidget, setOriginalProfileWidget] = useState('statistics');
    const [originalBirthday, setOriginalBirthday] = useState('');

    const fetchProfileData = useCallback(async () => {
        if (!user) return;
        setLoadingProfileData(true);
        try {
            const { data, error: fetchError } = await supabase
                .from('user_profiles')
                .select('social_links, description, profile_widget, birthday')
                .eq('user_id', user.id)
                .maybeSingle();

            if (fetchError) throw fetchError;

            if (data) {
                setOriginalDescription(data.description || '');
                setDescription(data.description || '');
                const allPlatforms = ['vk', 'twitch', 'youtube', 'discord', 'telegram', 'tiktok', 'yandex_music', 'boosty'];
                const normalizedOriginal = {};
                allPlatforms.forEach(platform => {
                  normalizedOriginal[platform] = data.social_links?.[platform] || null;
                });
                setOriginalSocialLinks(normalizedOriginal);
                setSocialLinks(normalizedOriginal);
                setOriginalProfileWidget(data.profile_widget || 'statistics');
                setProfileWidget(data.profile_widget || 'statistics');
                setOriginalBirthday(data.birthday || '');
                setBirthday(data.birthday || '');
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
  
      try {
        const session = await supabase.auth.getSession();
        if (!session.data.session) {
          setError('Session expired. Please log in again.');
          return;
        }
        // Validate birthday:
        if (birthday && isNaN(new Date(birthday).getTime())) {
          setError('Invalid birthday format. Please use YYYY-MM-DD.');
          return;
        }
        // Validate social links:
        for (const [platform, url] of Object.entries(socialLinks)) {
          if (url && !/^https?:\/\//i.test(url)) {
            setError(`Invalid URL for ${platform}: Must start with http:// or https://`);
            return;
          }
        }
        // Sanitize description:
        const safeDescription = simpleSanitize(description);
        const updates = {};
        if (safeDescription !== originalDescription) updates.description = safeDescription || null;
        const normalizedSocialLinks = Object.fromEntries(
          Object.entries(socialLinks).map(([key, value]) => [key, value?.trim() || null])
        );
        if (JSON.stringify(normalizedSocialLinks) !== JSON.stringify(originalSocialLinks)) updates.social_links = normalizedSocialLinks;
        if (profileWidget !== originalProfileWidget) updates.profile_widget = profileWidget;
        if (birthday !== originalBirthday) updates.birthday = birthday || null;

        if (Object.keys(updates).length === 0) {
          setError(t('edit_profile.noChanges'));
          setSaving(false);
          return;
        }

        updates.updated_at = new Date().toISOString();
        const { error: updateError } = await supabase.from('user_profiles').update(updates).eq('user_id', user.id);
        if (updateError) throw updateError;

        // Update originals after success
        setOriginalDescription(safeDescription);
        setOriginalSocialLinks(normalizedSocialLinks);
        setOriginalProfileWidget(profileWidget);
        setOriginalBirthday(birthday);

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
        if (platform === 'yandex_music') return 'Yandex Music';
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
                    <label className={styles.label} htmlFor="birthday">{t('profile.edit.birthday')}</label>
                    <input id="birthday" type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className={styles.input} aria-label={t('profile.edit.birthday')} />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="description">{t('profile.edit.description')}</label>
                    <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} className={styles.textarea}></textarea>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>{t('profile.edit.widgetLabel')}</label>
                    <button type="button" onClick={() => setShowModal(true)} className={styles.widgetButton}>
                        {profileWidget === 'statistics' ? t('profile.edit.widgetStatistics') : t('profile.edit.widgetAchievements')}
                    </button>
                </div>

                {showModal && (
                    <div className={styles.modalOverlay} onClick={() => setShowModal(false)} role="dialog" aria-modal="true">
                        <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                            <h2>{t('profile.edit.selectWidget')}</h2>
                            <div className={styles.widgetPreview}>
                                <div onClick={() => { setTempWidget('statistics'); }}>
                                    <h3>{t('profile.edit.widgetStatistics')}</h3>
                                    <div className={styles.previewBox}>
                                        <p>{t('profile.edit.subscribers')}: 1000</p>
                                        <p>{t('profile.edit.views')}: 50000</p>
                                        {/* Другие статы без дубликатов */}
                                    </div>
                                </div>
                                <div onClick={() => { setTempWidget('achievements'); }}>
                                    <h3>{t('profile.edit.widgetAchievements')}</h3>
                                    <div className={styles.previewBox}>
                                        <p>{t('profile.edit.rareAchievement1')} (0.5% {t('profile.edit.players')})</p>
                                        <p>{t('profile.edit.rareAchievement2')} (1% {t('profile.edit.players')})</p>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => { setProfileWidget(tempWidget); setShowModal(false); }}>{t('profile.edit.close')}</button>
                        </div>
                    </div>
                )}

                <div className={styles.formGroup}>
                    <label className={styles.label}>{t('profile.edit.socialLinks')}</label>
                    <div className={styles.socialLinksContainer}>
                        {['twitch', 'youtube', 'telegram', 'discord', 'vk', 'tiktok', 'yandex_music', 'boosty'].map(platform => (
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

                {error && <p className={styles.errorMessage}>{typeof error === 'string' ? error : t(error.key, error.options)}</p>}
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