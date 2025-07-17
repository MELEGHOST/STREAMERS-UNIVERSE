'use client';

import { useTranslation } from 'react-i18next';
import styles from './AchievementsWidget.module.css';
import pageStyles from '../../../styles/page.module.css';
import { useState, useEffect } from 'react';

function AchievementCard({ achievement, t }) {
    const nameKey = `achievements.${achievement.code}.name`;
    const descriptionKey = `achievements.${achievement.code}.description`;

    return (
        <div className={styles.achievementCard}>
            <div className={styles.achievementIcon}>{achievement.icon || '🏅'}</div>
            <div className={styles.achievementInfo}>
                <h3 className={styles.achievementName}>{t(nameKey)}</h3>
                <p className={styles.achievementDescription}>{t(descriptionKey)} ({achievement.rarity.toFixed(1)}% {t('achievements.rarity')})</p>
            </div>
        </div>
    );
}

export default function AchievementsWidget({ }) {
    const { t } = useTranslation();
    
    const [achievements, setAchievements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    useEffect(() => {
        async function fetch() {
            try {
                const response = await fetch('/api/achievements');
                if (!response) throw new Error('No response from server');
                if (!response.ok) {
                    throw new Error('Failed to fetch achievements');
                }
                const enrichedData = await response.json();
                setAchievements(enrichedData);
            } catch (e) {
                console.error('Fetch error:', e);
                setFetchError('Failed to load achievements');
            } finally {
                setLoading(false);
            }
        }
        fetch();
    }, []);

    if (loading) return <div className={pageStyles.loadingContainer}><p>{t('loading.achievements')}</p></div>;
    if (fetchError) return <div className={pageStyles.errorMessage}><p>{t('profile_page.achievements_page.error', { message: fetchError.message })}</p></div>;

    const unlockedAchievements = achievements.filter(ach => ach.is_unlocked) || [];

    return (
        <div className={styles.widgetContainer}>
            <h2 className={styles.widgetTitle}>{t('achievements.page.title')}</h2>
            {unlockedAchievements.length > 0 ? (
                <div className={styles.achievementsList}>
                    {unlockedAchievements.map(ach => (
                        <AchievementCard key={ach.id} achievement={ach} t={t} />
                    ))}
                </div>
            ) : (
                <p className={styles.noAchievements}>{t('achievements_page.noAchievements')}</p>
            )}
            <h3>{t('achievements.available')}</h3>
            <div className={styles.achievementsList}>
                {achievements.filter(ach => !ach.is_unlocked).map(ach => (
                    <AchievementCard key={ach.id} achievement={ach} t={t} isLocked={true} />
                ))}
            </div>
        </div>
    );
} 