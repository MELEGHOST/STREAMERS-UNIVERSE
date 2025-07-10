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

    const [description, setDescription] = useState('');
    const [socialLinks, setSocialLinks] = useState({});
    const [profileWidget, setProfileWidget] = useState('statistics');
    const [birthday, setBirthday] = useState('');
    
    const [loadingProfileData, setLoadingProfileData] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [showModal, setShowModal] = useState(false);

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
                setDescription(data.description || '');
                setProfileWidget(data.profile_widget || 'statistics');
                setSocialLinks(data.social_links || {});
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
  
      const nonEmptySocialLinks = Object.fromEntries(
          Object.entries(socialLinks).filter(([, value]) => value.trim() !== '')
      );
  
      const profileDataToUpdate = {
        description: description || null,
        social_links: nonEmptySocialLinks,
        profile_widget: profileWidget,
        birthday: birthday || null,
        updated_at: new Date(),
      };
  
      try {
        const { error: updateError } = await supabase
            .from('user_profiles')
            .upsert([{ user_id: user.id, ...profileDataToUpdate }], { onConflict: 'user_id' });

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
                    <input id="birthday" type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className={styles.input} />
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
                    <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
                        <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                            <h2>Выберите виджет</h2>
                            <div className={styles.widgetPreview}>
                                <div onClick={() => { setProfileWidget('statistics'); setShowModal(false); }}>
                                    <h3>{t('profile.edit.widgetStatistics')}</h3>
                                    <div className={styles.previewBox}>
                                        <p>Подписчики: 1000</p>
                                        <p>Просмотры: 50000</p>
                                        {/* Другие статы без дубликатов */}
                                    </div>
                                </div>
                                <div onClick={() => { setProfileWidget('achievements'); setShowModal(false); }}>
                                    <h3>{t('profile.edit.widgetAchievements')}</h3>
                                    <div className={styles.previewBox}>
                                        <p>Редкое достижение 1 (0.5% игроков)</p>
                                        <p>Редкое достижение 2 (1% игроков)</p>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)}>Закрыть</button>
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