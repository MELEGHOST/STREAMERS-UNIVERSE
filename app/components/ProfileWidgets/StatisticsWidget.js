import React from 'react';
import styles from './StatisticsWidget.module.css';
import { FaTwitch, FaUserFriends, FaEye, FaCalendarAlt } from 'react-icons/fa';

// Импортируем кнопки социальных сетей
import VkButton from '../SocialButtons/VkButton';
import TwitchButton from '../SocialButtons/TwitchButton';
import YoutubeButton from '../SocialButtons/YoutubeButton';
import DiscordButton from '../SocialButtons/DiscordButton';
import TelegramButton from '../SocialButtons/TelegramButton';
import TiktokButton from '../SocialButtons/TiktokButton';
import BoostyButton from '../SocialButtons/BoostyButton';
import YandexMusicButton from '../SocialButtons/YandexMusicButton';


const StatisticsWidget = ({ twitchData, profileData }) => {
    const socialLinks = profileData?.social_links || {};

    const formatNumber = (num) => {
        if (num === null || num === undefined) return 'N/A';
        return new Intl.NumberFormat('ru-RU').format(num);
    };
    
    return (
        <div className={styles.widgetContainer}>
            <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                    <FaUserFriends className={styles.statIcon} />
                    <span className={styles.statValue}>{formatNumber(twitchData?.followers_count)}</span>
                    <span className={styles.statLabel}>Фолловеры</span>
                </div>
                <div className={styles.statItem}>
                    <FaEye className={styles.statIcon} />
                    <span className={styles.statValue}>{formatNumber(twitchData?.view_count)}</span>
                    <span className={styles.statLabel}>Просмотры</span>
                </div>
                <div className={styles.statItem}>
                    <FaTwitch className={styles.statIcon} />
                    <span className={styles.statValue}>{twitchData?.broadcaster_type || 'N/A'}</span>
                    <span className={styles.statLabel}>Статус</span>
                </div>
                <div className={styles.statItem}>
                    <FaCalendarAlt className={styles.statIcon} />
                    <span className={styles.statValue}>{new Date(twitchData?.created_at).toLocaleDateString('ru-RU')}</span>
                    <span className={styles.statLabel}>На Twitch c</span>
                </div>
            </div>

            <div className={styles.socialLinksContainer}>
                {socialLinks.twitch && <TwitchButton url={socialLinks.twitch} />}
                {socialLinks.youtube && <YoutubeButton url={socialLinks.youtube} />}
                {socialLinks.discord && <DiscordButton url={socialLinks.discord} />}
                {socialLinks.telegram && <TelegramButton url={socialLinks.telegram} />}
                {socialLinks.vk && <VkButton url={socialLinks.vk} />}
                {socialLinks.tiktok && <TiktokButton url={socialLinks.tiktok} />}
                {socialLinks.boosty && <BoostyButton url={socialLinks.boosty} />}
                {socialLinks.yandex_music && <YandexMusicButton url={socialLinks.yandex_music} />}
            </div>
        </div>
    );
};

export default StatisticsWidget; 