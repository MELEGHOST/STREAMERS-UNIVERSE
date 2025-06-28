'use client';

import React from 'react';
import Link from 'next/link';
import styles from './StyledSocialButton.module.css'; // Импортируем CSS-модуль

// --- Конфигурация платформ ---
const platformData = {
  vk: {
    color: '#4a76a8',
    label: 'VK',
    iconLetter: 'V',
    tooltipName: 'VKontakte',
    tooltipDetail: 'Профиль/Сообщество',
    // SVG Path для VK (примерный, может потребоваться viewBox="0 0 24 24" или другой)
    svgPath: 'M13.16 12.233c.827 0 .996-.5 .996-1.547v-2.172c0-.813-.17-1.37-.996-1.37-.827 0-1.16.557-1.16 1.37v2.172c0 1.047.333 1.547 1.16 1.547zm-6.09-6.833h1.854c.094 1.872.94 2.924 2.08 2.924.996 0 1.547-.514 1.547-1.327 0-2.41-4.086-2.58-4.086-5.14 0-1.702 1.16-2.754 3.044-2.754 1.16 0 2.08.47 2.81 1.413l-1.453.94c-.47-.606-.996-1.04-1.546-1.04-.557 0-.887.334-.887.887 0 2.08 4.086 2.204 4.086 4.854 0 1.04-.557 2.08-2.58 2.08-1.796 0-2.76-.996-3.26-2.367h-1.59zm10.684 6.36c-.28.186-.7.42-1.114.42-.7 0-.793-.373-.793-1.027v-4.466h-1.697v4.94c0 1.547.84 2.08 1.797 2.08.7 0 1.16-.373 1.697-.887v.793h1.697v-5.186h-1.587v3.334z',
    viewBox: '0 0 24 24' // Стандартный viewBox
  },
  twitch: {
    color: '#9146ff',
    label: 'Twitch',
    iconLetter: 'T',
    tooltipName: 'Twitch',
    tooltipDetail: 'Канал на Twitch',
    // SVG Path для Twitch (ViewBox 0 0 24 24)
    svgPath: 'M2.149 0l-1.612 4.119v16.836h5.731v3.045h3.224l3.045-3.045h4.657l6.269-6.269v-14.686h-21.314zm19.164 13.612l-3.582 3.582h-5.731l-3.045 3.045v-3.045h-4.836v-15.045h17.194v11.463zm-3.582-7.343v6.262h-2.149v-6.262h2.149zm-5.731 0v6.262h-2.149v-6.262h2.149z',
    viewBox: '0 0 24 24' // Стандартный viewBox
  },
  discord: {
    color: '#5865f2',
    label: 'Discord',
    iconLetter: 'D',
    tooltipName: 'Discord',
    tooltipDetail: 'Профиль/Сервер',
    // SVG Path для Discord (примерный, viewBox="0 0 24 24")
    svgPath: 'M20.317 4.369a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037 18.082 18.082 0 00-1.077 1.615 18.433 18.433 0 00-4.885 0 18.082 18.082 0 00-1.077-1.615.074.074 0 00-.079-.037A19.736 19.736 0 003.683 4.37a.074.074 0 00-.034.044 21.446 21.446 0 00-.651 6.29c0 6.173 4.098 11.539 9.996 11.539s9.996-5.366 9.996-11.539a21.446 21.446 0 00-.651-6.29.074.074 0 00-.034-.044zm-6.321 9.808a2.413 2.413 0 11-2.413-2.413 2.413 2.413 0 012.413 2.413zm-4.825 0a2.413 2.413 0 11-2.413-2.413 2.413 2.413 0 012.413 2.413z',
    viewBox: '0 0 24 24' // Стандартный viewBox
  },
  youtube: {
    color: '#ff0000',
    label: 'YouTube',
    iconLetter: 'Y',
    tooltipName: 'YouTube',
    tooltipDetail: 'Канал на YouTube',
    // SVG Path для YouTube (ViewBox="0 0 24 24")
    svgPath: 'M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
    viewBox: '0 0 24 24' // viewBox из твоего примера
  },
  yandex_music: {
    color: '#ffdb4d',
    label: 'Я.Музыка',
    iconLetter: 'Я',
    tooltipName: 'Яндекс Музыка',
    tooltipDetail: 'Профиль музыканта',
    // SVG Path для Яндекс.Музыки (треугольник)
    svgPath: 'M119.413 82.493L45.264 128.838V36.147l74.149 46.346z',
    viewBox: '0 0 165 165' // Используем оригинальный viewBox
  },
  default: {
    color: 'var(--foreground-secondary)',
    label: 'Link',
    iconLetter: 'L',
    tooltipName: 'Ссылка',
    tooltipDetail: 'Внешний ресурс',
    svgPath: 'M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm0 22c-5.514 0-10-4.486-10-10s4.486-10 10-10 10 4.486 10 10-4.486 10-10 10zm5-10h-4v-4h-2v4h-4v2h4v4h2v-4h4v-2z', // Пример иконки ссылки
    viewBox: '0 0 24 24'
  }
};
// --------------------------------

const StyledSocialButton = ({ platform, url }) => {
  const config = platformData[platform] || platformData.default;

  // Проверка URL (оставляем как было)
  let finalUrl = url;
  if (typeof url === 'string' && url && !url.startsWith('http') && !url.startsWith('//')) {
      if (platform !== 'discord' || url.includes('discord.gg') || url.includes('.com')) {
          // Для дискорда без http добавлять не будем
      } else {
          finalUrl = '#'; // Если дискорд без http, делаем ссылку-заглушку
      }
  } else if (!url || typeof url !== 'string') {
     console.warn(`[StyledSocialButton] Invalid URL for ${platform}:`, url);
     return null;
  }

  // Определяем, нужно ли делать ссылку активной
  const isLinkActive = platform !== 'discord' || (typeof finalUrl === 'string' && finalUrl.startsWith('http'));

  // Используем обычный div и передаем CSS-переменную через style
  return (
    <div style={{ '--color': config.color }}>
      <div className={styles.tooltipContainer}>
        <div className={styles.tooltip}>
          <div className={styles.profile}>
            <div className={styles.user}>
              <div className={styles.img}>{config.iconLetter}</div>
              <div className="details">
                <div className={styles.name}>{config.tooltipName}</div>
                <div className={styles.username}>{config.label}</div>
              </div>
            </div>
            <div className={styles.about}>{config.tooltipDetail}</div>
          </div>
        </div>
        <div className={styles.textWrapper}>
          {isLinkActive ? (
            <Link href={finalUrl} target="_blank" rel="noopener noreferrer" className={styles.icon}>
              <ButtonContent config={config} />
            </Link>
          ) : (
            <span className={styles.icon} title={`Discord: ${url}`}>
              <ButtonContent config={config} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Выносим повторяющееся содержимое кнопки в отдельный компонент
const ButtonContent = ({ config }) => (
  <>
    <div className={styles.layer}>
      <span />
      <span />
      <span />
      <span />
      <span className={styles.svgContainer}>
        <svg
          xmlnsXlink="http://www.w3.org/1999/xlink"
          xmlns="http://www.w3.org/2000/svg"
          version="1.1"
          viewBox={config.viewBox || '0 0 24 24'}
          className={styles.svgIcon}
        >
          {config.svgPath ? (
             <path d={config.svgPath} />
          ) : (
             <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="14" fill="currentColor">{config.iconLetter}</text>
          )}
        </svg>
      </span>
    </div>
    <div className={styles.textLabel}>{config.label}</div>
  </>
);

export default StyledSocialButton; 