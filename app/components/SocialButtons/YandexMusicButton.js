'use client';

import React from 'react';
import styles from './SocialButton.module.css';

// Принимаем value (url) и опциональный count
const YandexMusicButton = ({ value, count, className }) => {
  if (!value) return null;

  // Формируем URL
  const href = value.startsWith('http') ? value : `https://${value}`; // Яндекс Музыка всегда ссылка

  // Пытаемся извлечь имя артиста/альбома (упрощенно)
  let displayUsername = 'Профиль/Трек';
  try {
    const urlObj = new URL(href);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts[0] === 'artist' && pathParts[1]) {
      displayUsername = decodeURIComponent(pathParts[1]);
    } else if (pathParts[0] === 'album' && pathParts[1]) {
      displayUsername = `Альбом ${decodeURIComponent(pathParts[1])}`;
    } else if (pathParts[0] === 'track' && pathParts[1]) {
      displayUsername = `Трек ${decodeURIComponent(pathParts[1])}`;
    }
  } catch {
    /* Оставляем 'Профиль/Трек' */
  }

  // Форматируем count (если он есть и число)
  const formatCount = (num) => {
    if (typeof num !== 'number' || isNaN(num)) return null;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M+`;
    if (num >= 1000) return `${Math.floor(num / 1000)}k+`;
    return `${num}`;
  };
  const displayCount = formatCount(count);
  const aboutText = displayCount
    ? `${displayCount} слушателей`
    : 'Яндекс Музыка'; // Текст по умолчанию

  const yandexColor = '#ffdb00';

  return (
    <div
      className={`${styles.wrapper} ${className || ''}`}
      style={{ '--color': yandexColor }}
    >
      <div className={styles.tooltipContainer}>
        <div className={styles.tooltip}>
          <div className={styles.profile}>
            <div className={styles.user}>
              <div className={styles.img}>Ya</div>
              <div className={styles.details}>
                <div className={styles.name}>Яндекс Музыка</div>
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
              <span style={{ background: '#212121' }} />
              <span style={{ background: '#212121' }} />
              <span style={{ background: '#212121' }} />
              <span style={{ background: '#212121' }} />
              <span
                className={styles.svgContainer}
                style={{ background: '#212121' }}
              >
                <svg
                  className={styles.svg}
                  version="1.1"
                  id="Слой_1"
                  xmlns="http://www.w3.org/2000/svg"
                  xmlnsXlink="http://www.w3.org/1999/xlink"
                  x="0px"
                  y="0px"
                  viewBox="8 8 60 60"
                  xmlSpace="preserve"
                >
                  <path
                    id="star"
                    d="M39.2,20.019l-0.129-0.607l-5.097-0.892l2.968-4.021
            L36.6,14.104l-4.364,2.104l0.552-5.573l-0.447-0.261l-2.655,4.52l-2.971-6.728h-0.524l0.709,6.491l-7.492-6.019l-0.631,0.184
            l5.757,7.281l-11.407-3.812l-0.527,0.58L22.8,18.705L8.739,19.887l-0.157,0.868l14.612,1.601L10.999,32.504l0.527,0.708
            l14.508-7.937l-2.864,13.984h0.868l5.569-13.168L33,36.392l0.603-0.473L32.212,25.46l5.28,6.019l0.341-0.555l-4.045-7.463
            l5.649,2.103l0.053-0.631l-5.072-3.76L39.2,20.019z"
                  />
                </svg>
              </span>
            </div>
            <div className={styles.textLabel}>Яндекс Музыка</div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default YandexMusicButton;
