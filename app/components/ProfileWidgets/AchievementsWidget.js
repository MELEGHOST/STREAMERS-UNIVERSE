'use client';

import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import styles from './AchievementsWidget.module.css';
import pageStyles from '../../../styles/page.module.css';

const fetcher = (url, token) => fetch(url, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json());

function AchievementCard({ achievement, t }) {
    const nameKey = `achievements.${achievement.code}.name`;
    const descriptionKey = `achievements.${achievement.code}.description`;

    return (
        <div className={styles.achievementCard}>
            <div className={styles.achievementIcon}>{achievement.icon || '🏅'}</div>
            <div className={styles.achievementInfo}>
                <h3 className={styles.achievementName}>{t(nameKey)}</h3>
                <p className={styles.achievementDescription}>{t(descriptionKey)}</p>
            </div>
        </div>
    );
}

export default function AchievementsWidget({ authToken }) {
    const { t } = useTranslation();
    
    const { data: apiData, error, isLoading } = useSWR(
        authToken ? [`/api/achievements`, authToken] : null,
        ([url, token]) => fetcher(url, token)
    );

    if (isLoading) return <div className={pageStyles.loadingContainer}><p>{t('loading.achievements')}</p></div>;
    if (error) return <div className={pageStyles.errorMessage}><p>{t('achievements_page.error', { message: error.message })}</p></div>;

    const unlockedAchievements = apiData?.achievements?.filter(ach => ach.is_unlocked) || [];

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
        </div>
    );
} 