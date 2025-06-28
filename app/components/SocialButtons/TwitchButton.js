'use client';

import React from 'react';
import styles from './SocialButton.module.css';

// Принимаем value (username) и count (реальные фолловеры)
const TwitchButton = ({ value, count, className }) => {
  if (!value) return null;

  // Формируем URL и отображаемое имя
  const href = `https://twitch.tv/${value.replace('@', '')}`;
  const displayUsername = value.replace('@', '');

  // Форматируем count
  const formatCount = (num) => {
    if (typeof num !== 'number' || isNaN(num)) return null;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M+`;
    if (num >= 1000) return `${Math.floor(num / 1000)}k+`;
    return `${num}`;
  };
  const displayCount = formatCount(count);
  // Здесь count должен быть реальным, поэтому текст другой
  const aboutText = displayCount ? `${displayCount} фолловеров` : 'Канал на Twitch'; 

  const twitchColor = '#9146ff';

  return (
    <div 
      className={`${styles.wrapper} ${className || ''}`}
      style={{ '--color': twitchColor }}
    >
      <div className={styles.tooltipContainer}>
        <div className={styles.tooltip}>
          <div className={styles.profile}>
            <div className={styles.user}>
              <div className={styles.img}>Tw</div>
              <div className={styles.details}>
                <div className={styles.name}>Twitch</div>
                <div className={styles.username}>@{displayUsername}</div>
              </div>
            </div>
            <div className={styles.about}>{aboutText}</div>
          </div>
        </div>
        <div className={styles.text}>
          <a href={href} target="_blank" rel="noopener noreferrer" className={styles.icon}>
            <div className={styles.layer}>
              <span />
              <span />
              <span />
              <span />
              <span className={styles.svgContainer}>
                <svg className={styles.svg} fill="currentColor" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                  <path d="M80 0L32 96v352h128v64h64l64-64h96l128-128V0H80zm384 288l-64 64h-96l-64 64v-64H128V64h336v224zm-72-160h-32v96h32V128zm-80 0h-32v96h32V128z" />
                </svg>
              </span>
            </div>
            <div className={styles.textLabel}>Twitch</div>
          </a>
        </div>
      </div>
    </div>
  );
}

export default TwitchButton; 