'use client';

import React from 'react';
import styles from './SocialButton.module.css';

// Принимаем value (username или url) и опциональный count
const TelegramButton = ({ value, count, className }) => {
  if (!value) return null;

  // Формируем URL и отображаемое имя
  const isLink = /^https?:\/\//i.test(value);
  const href = isLink ? value : `https://t.me/${value.replace('@', '')}`;
  const displayUsername = value.replace('https://t.me/', '').replace('@', '');

  // Форматируем count (если он есть и число)
  const formatCount = (num) => {
    if (typeof num !== 'number' || isNaN(num)) return null;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M+`;
    if (num >= 1000) return `${Math.floor(num / 1000)}k+`;
    return `${num}`;
  };
  const displayCount = formatCount(count);
  const aboutText = displayCount ? `${displayCount} подписчиков` : 'Канал/Чат'; // Текст по умолчанию, если нет count

  const telegramColor = '#229ed9';

  return (
    <div
      className={`${styles.wrapper} ${className || ''}`}
      style={{ '--color': telegramColor }}
    >
      <div className={styles.tooltipContainer}>
        <div className={styles.tooltip}>
          <div className={styles.profile}>
            <div className={styles.user}>
              <div className={styles.img}>TG</div>
              <div className={styles.details}>
                <div className={styles.name}>Telegram</div>
                <div className={styles.username}>@{displayUsername}</div>
              </div>
            </div>
            <div className={styles.about}>{aboutText}</div>
          </div>
        </div>
        <div className={styles.text}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.icon}
          >
            <div className={styles.layer}>
              <span />
              <span />
              <span />
              <span />
              <span className={styles.svgContainer}>
                <svg
                  className={styles.svg}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 240 240"
                >
                  <path
                    fill="currentColor"
                    d="M120,0C53.7,0,0,53.7,0,120s53.7,120,120,120s120-53.7,120-120S186.3,0,120,0z M175.3,78.1l-21.2,100.1
              c-1.6,7.1-5.8,8.9-11.7,5.6l-32.4-23.9l-15.6,15.1c-1.7,1.7-3.1,3.1-6.3,3.1l2.3-32.9l59.9-54.1c2.6-2.3-0.6-3.6-4-1.3l-74,46.6
              l-31.9-10c-6.9-2.1-7-6.9,1.5-10.2l124.6-48.1C171.2,66.5,177.2,70.4,175.3,78.1z"
                  />
                </svg>
              </span>
            </div>
            <div className={styles.textLabel}>Telegram</div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default TelegramButton;
