'use client';

import React from 'react';
import styles from './StatisticsWidget.module.css';
import { FaTwitch, FaUserFriends, FaEye, FaCalendarAlt } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

// Импортируем кнопки социальных сетей
import VkButton from '../SocialButtons/VkButton';
import TwitchButton from '../SocialButtons/TwitchButton';
import YoutubeButton from '../SocialButtons/YoutubeButton';
import DiscordButton from '../SocialButtons/DiscordButton';
import TelegramButton from '../SocialButtons/TelegramButton';
import TiktokButton from '../SocialButtons/TiktokButton';
import BoostyButton from '../SocialButtons/BoostyButton';
import YandexMusicButton from '../SocialButtons/YandexMusicButton';


const StatisticsWidget = ({ twitchData, twitchUserData, profileData, stats }) => {
    const { t } = useTranslation();
    const socialLinks = profileData?.social_links || {};
    const source = twitchUserData || twitchData || {};

    const formatNumber = (num) => {
        if (num === null || num === undefined) return 'N/A';
        return new Intl.NumberFormat('ru-RU').format(num);
    };
    
    return (
        <div className={styles.widgetContainer}>
            <h2 className={styles.widgetTitle}>{t('statistics.widget.title')}</h2>
            <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                    <FaUserFriends className={styles.statIcon} />
                    <span className={styles.statValue}>{formatNumber(stats?.[0]?.value ?? source?.followers_count)}</span>
                    <span className={styles.statLabel}>{t('followers')}</span>
                </div>
                <div className={styles.statItem}>
                    <FaEye className={styles.statIcon} />
                    <span className={styles.statValue}>{formatNumber(stats?.[1]?.value ?? source?.view_count)}</span>
                    <span className={styles.statLabel}>{t('profile_page.views')}</span>
                </div>
                <div className={styles.statItem}>
                    <FaTwitch className={styles.statIcon} />
                    <span className={styles.statValue}>{source?.broadcaster_type || 'N/A'}</span>
                    <span className={styles.statLabel}>{t('profile_page.broadcasterLabel', { defaultValue: 'Статус' })}</span>
                </div>
                <div className={styles.statItem}>
                    <FaCalendarAlt className={styles.statIcon} />
                    <span className={styles.statValue}>{source?.created_at ? new Date(source.created_at).toLocaleDateString('ru-RU') : '—'}</span>
                    <span className={styles.statLabel}>{t('profile_page.onTwitchSince', { defaultValue: 'На Twitch с' })}</span>
                </div>
            </div>

            <div className={styles.socialLinksContainer}>
                {socialLinks.twitch && <TwitchButton value={socialLinks.twitch} />}
                {socialLinks.youtube && <YoutubeButton value={socialLinks.youtube} />}
                {socialLinks.discord && <DiscordButton value={socialLinks.discord} />}
                {socialLinks.telegram && <TelegramButton value={socialLinks.telegram} />}
                {socialLinks.vk && <VkButton value={socialLinks.vk} />}
                {socialLinks.tiktok && <TiktokButton value={socialLinks.tiktok} />}
                {socialLinks.boosty && <BoostyButton value={socialLinks.boosty} />}
                {socialLinks.yandex_music && <YandexMusicButton value={socialLinks.yandex_music} />}
            </div>
        </div>
    );
};

export default StatisticsWidget; 