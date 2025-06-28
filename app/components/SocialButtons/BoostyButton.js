'use client';

import React from 'react';
import styles from './SocialButton.module.css'; // Импортируем общий модуль
import { SiBoosty } from "react-icons/si";

const BoostyButton = ({ value, count, className }) => {
  if (!value) return null;

  const href = value.startsWith('http') ? value : `https://boosty.to/${value.replace('@', '')}`;
  const displayUsername = value.replace('https://boosty.to/', '').replace('@', '');

  const formatCount = (num) => {
    if (typeof num !== 'number' || isNaN(num)) return null;
    if (num >= 1000) return `${Math.floor(num / 1000)}k+`;
    return `${num}`;
  };
  const displayCount = formatCount(count);
  const aboutText = displayCount ? `${displayCount} подписчиков` : 'Страница Boosty';

  const boostyColor = '#f15f2c'; // Уникальный цвет для Boosty

  return (
    <div 
      className={`${styles.wrapper} ${className || ''}`} 
      style={{ '--color': boostyColor }}
    >
      <div className={styles.tooltipContainer}>
        <div className={styles.tooltip}>
          <div className={styles.profile}>
            <div className={styles.user}>
              <div className={styles.img}>Bo</div>
              <div className={styles.details}>
                <div className={styles.name}>Boosty</div>
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
                 <SiBoosty className={styles.svg} /> 
              </span>
            </div>
            <div className={styles.textLabel}>Boosty</div>
          </a>
        </div>
      </div>
    </div>
  );
}

export default BoostyButton; 