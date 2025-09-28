'use client';

import React from 'react';
import styles from './SocialButton.module.css';

// Принимаем value (url канала/видео) и опциональный count
const YoutubeButton = ({ value, count, className }) => {
  if (!value) return null;

  // Формируем URL (просто используем value, т.к. это всегда ссылка)
  const href = value.startsWith('http') ? value : `https://${value}`;

  // Пытаемся извлечь имя канала или ID из URL (упрощенно)
  let displayUsername = 'Канал';
  try {
    const urlObj = new URL(href);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts[0] === 'channel' && pathParts[1]) {
      displayUsername = pathParts[1];
    } else if (pathParts[0] === 'c' && pathParts[1]) {
      displayUsername = pathParts[1];
    } else if (pathParts[0] === 'user' && pathParts[1]) {
      displayUsername = pathParts[1];
    } else if (urlObj.hostname.includes('youtu.be')) {
      displayUsername = 'Видео'; // Короткая ссылка
    } else if (urlObj.searchParams.get('v')) {
      displayUsername = 'Видео'; // Ссылка на видео
    }
  } catch {
    /* Оставляем 'Канал' */
  }

  // Форматируем count
  const formatCount = (num) => {
    if (typeof num !== 'number' || isNaN(num)) return null;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M+`;
    if (num >= 1000) return `${Math.floor(num / 1000)}k+`;
    return `${num}`;
  };
  const displayCount = formatCount(count);
  const aboutText = displayCount
    ? `${displayCount} подписчиков`
    : 'Канал YouTube'; // Текст по умолчанию

  const youtubeColor = 'red';

  return (
    <div
      className={`${styles.wrapper} ${className || ''}`}
      style={{ '--color': youtubeColor }}
    >
      <div className={styles.tooltipContainer}>
        <div className={styles.tooltip}>
          <div className={styles.profile}>
            <div className={styles.user}>
              <div className={styles.img}>YT</div>
              <div className={styles.details}>
                <div className={styles.name}>YouTube</div>
                <div className={styles.username}>{displayUsername}</div>
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
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                  version="1.1"
                  viewBox="0 -7 48 48"
                >
                  <path
                    d="M219.044,391.269916 L219.0425,377.687742 L232.0115,384.502244 L219.044,391.269916 Z M247.52,375.334163 C247.52,375.334163 247.0505,372.003199 245.612,370.536366 C243.7865,368.610299 241.7405,368.601235 240.803,368.489448 C234.086,368 224.0105,368 224.0105,368 L223.9895,368 C223.9895,368 213.914,368 207.197,368.489448 C206.258,368.601235 204.2135,368.610299 202.3865,370.536366 C200.948,372.003199 200.48,375.334163 200.48,375.334163 C200.48,375.334163 200,379.246723 200,383.157773 L200,386.82561 C200,390.73817 200.48,394.64922 200.48,394.64922 C200.48,394.64922 200.948,397.980184 202.3865,399.447016 C204.2135,401.373084 206.612,401.312658 207.68,401.513574 C211.52,401.885191 224,402 224,402 C224,402 234.086,401.984894 240.803,401.495446 C241.7405,401.382148 243.7865,401.373084 245.612,399.447016 C247.0505,397.980184 247.52,394.64922 247.52,394.64922 C247.52,394.64922 248,390.73817 248,386.82561 L248,383.157773 C248,379.246723 247.52,375.334163 247.52,375.334163 L247.52,375.334163 Z"
                    transform="translate(-200, -368)"
                  />
                </svg>
              </span>
            </div>
            <div className={styles.textLabel}>YouTube</div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default YoutubeButton;
