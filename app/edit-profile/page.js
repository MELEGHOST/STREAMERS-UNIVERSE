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
    const { t } = useTranslation('common');

    const [description, setDescription] = useState('');
    const [socialLinks, setSocialLinks] = useState({});
    const [profileWidget, setProfileWidget] = useState('statistics');
    const [birthday, setBirthday] = useState('');
    const [role, setRole] = useState('viewer');
    const [followersTarget, setFollowersTarget] = useState(1000);
    
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
                .select('social_links, description, profile_widget, birthday, role, followers_target')
                .eq('user_id', user.id)
                .maybeSingle();

            if (fetchError) throw fetchError;

            if (data) {
                setOriginalDescription(data.description || '');
                setDescription(data.description || '');
                const allPlatforms = ['twitch','youtube','telegram','discord','vk','tiktok','yandex_music','boosty','instagram','x','kick','facebook','reddit','steam'];
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
                setRole(data.role || 'viewer');
                setFollowersTarget(data.followers_target || 1000);
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
        setError(t('edit_profile.userError', { defaultValue: 'Пользователь не найден. Войдите снова.' }));
        return;
      }
  
      setSaving(true);
      setError(null);
      setSuccessMessage(null);
  
      try {
        const session = await supabase.auth.getSession();
        if (!session.data.session) {
          setError(t('edit_profile.sessionExpired', { defaultValue: 'Сессия истекла. Войдите заново.' }));
          return;
        }
        // Validate birthday:
        if (birthday && isNaN(new Date(birthday).getTime())) {
          setError(t('edit_profile.invalidBirthday', { defaultValue: 'Неверный формат даты. Используйте ГГГГ-ММ-ДД.' }));
          return;
        }
        // Требуем только полноценные ссылки (http/https), чтобы кнопки меню соцсетей были кликабельными
        for (const [platform, url] of Object.entries(socialLinks)) {
          const cleaned = (url ?? '').toString().trim();
          if (cleaned && !/^https?:\/\//i.test(cleaned)) {
            setError(t('edit_profile.invalidUrl', { defaultValue: `Некорректная ссылка для ${platform}. Добавьте http:// или https://` }));
            setSaving(false);
            return;
          }
        }
        // Sanitize description:
        const safeDescription = simpleSanitize(description);
        const updates = {};
        if (safeDescription !== originalDescription) updates.description = safeDescription || null;
        const normalizedSocialLinks = Object.fromEntries(
          Object.entries(socialLinks).map(([key, value]) => {
            const cleaned = (value ?? '').toString().trim();
            if (!cleaned) return [key, null];
            // уже проверено на http/https выше
            return [key, cleaned.length > 300 ? cleaned.slice(0, 300) : cleaned];
          })
        );
        if (JSON.stringify(normalizedSocialLinks) !== JSON.stringify(originalSocialLinks)) updates.social_links = normalizedSocialLinks;
        if (profileWidget !== originalProfileWidget) updates.profile_widget = profileWidget;
        if (birthday !== originalBirthday) updates.birthday = birthday || null;
        if (role) updates.role = role;
        if (followersTarget) updates.followers_target = Number(followersTarget) || 1000;

        if (Object.keys(updates).length === 0) {
          setError(t('edit_profile.noChanges', { defaultValue: 'Нет изменений для сохранения.' }));
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

        setSuccessMessage({ key: 'edit_profile.successMessage', defaultValue: 'Профиль обновлен.' });
 
        setTimeout(() => {
            const userTwitchId = user?.user_metadata?.provider_id;
            if (userTwitchId) {
                router.push(`/profile/${userTwitchId}`);
            } else {
                router.push('/profile');
            }
        }, 1000);
 
      } catch (err) {
        setError({ key: 'edit_profile.saveError', options: { message: err.message, defaultValue: 'Не удалось сохранить профиль: {{message}}' } });
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
                &larr; {t('profile.back', { defaultValue: 'Назад' })}
            </button>
            <h1 className={styles.title}>{t('profile.edit.title', { defaultValue: 'Редактирование профиля' })}</h1>
            <form onSubmit={handleSave} className={styles.form}>
                <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="birthday">{t('profile.edit.birthday', { defaultValue: 'Дата рождения' })}</label>
                    <input id="birthday" type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className={styles.input} aria-label={t('profile.edit.birthday')} />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="followersTarget">{t('profile.edit.followersTarget', { defaultValue: 'Цель по фолловерам' })}</label>
                    <input id="followersTarget" type="number" min="1" value={followersTarget} onChange={e => setFollowersTarget(e.target.value)} className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="role">{t('profile.edit.status', { defaultValue: 'Статус' })}</label>
                    <select id="role" className={styles.input} value={role} onChange={e => setRole(e.target.value)}>
                        <option value="viewer">{t('roles.viewer', { defaultValue: 'Зритель' })}</option>
                        <option value="streamer">{t('roles.streamer', { defaultValue: 'Стример' })}</option>
                        <option value="companion">{t('roles.companion', { defaultValue: 'Компаньон' })}</option>
                        <option value="admin">{t('roles.admin', { defaultValue: 'Админ' })}</option>
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="description">{t('profile.edit.description', { defaultValue: 'Описание' })}</label>
                    <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} className={styles.textarea}></textarea>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>{t('profile.edit.widgetLabel', { defaultValue: 'Виджет профиля на странице' })}</label>
                    <button type="button" onClick={() => setShowModal(true)} className={styles.widgetButton}>
                        {profileWidget === 'statistics' ? t('profile.edit.widgetStatistics', { defaultValue: 'Статистика' }) : t('profile.edit.widgetAchievements', { defaultValue: 'Достижения' })}
                    </button>
                </div>

                {showModal && (
                    <div className={styles.modalOverlay} onClick={() => setShowModal(false)} role="dialog" aria-modal="true">
                        <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                            <h2>{t('profile.edit.selectWidget', { defaultValue: 'Выберите виджет' })}</h2>
                            <div className={styles.widgetPreview}>
                                <div onClick={() => { setTempWidget('statistics'); }}>
                                    <h3>{t('profile.edit.widgetStatistics', { defaultValue: 'Статистика' })}</h3>
                                    <div className={styles.previewBox}>
                                        <p>{t('profile.edit.subscribers', { defaultValue: 'Подписчики' })}: 1000</p>
                                        <p>{t('profile.edit.views', { defaultValue: 'Просмотры' })}: 50000</p>
                                        {/* Другие статы без дубликатов */}
                                    </div>
                                </div>
                                <div onClick={() => { setTempWidget('achievements'); }}>
                                    <h3>{t('profile.edit.widgetAchievements', { defaultValue: 'Достижения' })}</h3>
                                    <div className={styles.previewBox}>
                                        <p>{t('profile.edit.rareAchievement1', { defaultValue: 'Редкое достижение #1' })} (0.5% {t('profile.edit.players', { defaultValue: 'игроков' })})</p>
                                        <p>{t('profile.edit.rareAchievement2', { defaultValue: 'Редкое достижение #2' })} (1% {t('profile.edit.players', { defaultValue: 'игроков' })})</p>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => { setProfileWidget(tempWidget); setShowModal(false); }}>{t('profile.edit.close', { defaultValue: 'Готово' })}</button>
                        </div>
                    </div>
                )}

                <div className={styles.formGroup}>
                    <label className={styles.label}>{t('profile.edit.socialLinks', { defaultValue: 'Ссылки и юзернеймы соцсетей' })}</label>
                    <div className={styles.socialLinksContainer}>
                        {['twitch','youtube','telegram','discord','vk','tiktok','yandex_music','boosty','instagram','x','kick','facebook','reddit','steam'].map(platform => (
                            <div key={platform} className={styles.socialLinkItem}>
                                <label className={styles.socialLinkLabel} htmlFor={platform}>{formatPlatformName(platform)}</label>
                                <input
                                    id={platform}
                                    type="text"
                                    value={socialLinks[platform] || ''}
                                    onChange={e => handleSocialLinkChange(platform, e.target.value)}
                                    className={styles.input}
                                    placeholder={t(`edit_profile.socialsPlaceholder.${platform}`, { defaultValue: 'вставьте ссылку или ник' })}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {error && <p className={styles.errorMessage}>{typeof error === 'string' ? error : t(error.key, error.options)}</p>}
                {successMessage && <p className={styles.successMessage}>{t(successMessage.key, { defaultValue: successMessage.defaultValue })}</p>}
                
                <button type="submit" className={styles.saveButton} disabled={saving}>
                    {saving ? t('profile.edit.saving', { defaultValue: 'Сохраняем…' }) : t('profile.save', { defaultValue: 'Сохранить' })}
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