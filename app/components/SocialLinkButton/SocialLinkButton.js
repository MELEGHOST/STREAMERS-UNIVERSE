import React from 'react';
import Link from 'next/link';
import styles from './SocialLinkButton.module.css';

// Импортируем иконки (предполагается, что они есть в /public/icons)
// Если иконок нет, можно использовать текстовые метки или FontAwesome
// import { FaTwitch, FaVk, FaDiscord, FaYoutube, FaMusic } from 'react-icons/fa'; 

const platformConfig = {
  vk: {
    // icon: FaVk,
    text: 'VK', 
    className: styles.vk,
    defaultUrlPrefix: 'https://vk.com/',
  },
  twitch: {
    // icon: FaTwitch,
    text: 'Twitch',
    className: styles.twitch,
    defaultUrlPrefix: 'https://twitch.tv/',
  },
  discord: {
    // icon: FaDiscord,
    text: 'Discord', 
    className: styles.discord,
    defaultUrlPrefix: 'https://discord.com/users/', // Или для приглашения?
  },
  youtube: {
    // icon: FaYoutube,
    text: 'YouTube',
    className: styles.youtube,
    defaultUrlPrefix: 'https://youtube.com/',
  },
  yandex_music: {
    // icon: FaMusic, // или другая иконка
    text: 'Я.Музыка',
    className: styles.yandexMusic,
    defaultUrlPrefix: 'https://music.yandex.ru/',
  },
  default: {
    text: 'Link',
    className: styles.default,
    defaultUrlPrefix: '',
  }
};

const SocialLinkButton = ({ platform, url, text: customText }) => {
  const config = platformConfig[platform] || platformConfig.default;
  const buttonText = customText || config.text;
  // const IconComponent = config.icon; // Раскомментировать, если используем иконки

  // Пытаемся сделать URL полным, если он не содержит http/https
  let finalUrl = url;
  if (url && !url.startsWith('http') && !url.startsWith('//')) {
      // Для Discord может быть username#tag, не делаем префикс
      if (platform !== 'discord' || url.includes('discord.gg') || url.includes('.com')) {
          finalUrl = config.defaultUrlPrefix + url;
      }
  } else if (!url) {
     return null; // Не рендерим кнопку без URL
  }

  return (
    <Link href={finalUrl || '#'} target="_blank" rel="noopener noreferrer" className={`${styles.button} ${config.className}`}>
      {/* IconComponent && <IconComponent className={styles.icon} /> */}
      <span className={styles.text}>{buttonText}</span>
    </Link>
  );
};

export default SocialLinkButton; 