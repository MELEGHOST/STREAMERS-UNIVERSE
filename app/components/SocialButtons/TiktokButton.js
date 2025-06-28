'use client';

import React from 'react';
import styles from './SocialButton.module.css';
import { FaTiktok } from "react-icons/fa";

const TiktokButton = ({ value, count, className }) => {
  if (!value) return null;

  const href = value.startsWith('http') ? value : `https://tiktok.com/@${value.replace('@', '')}`;
  const displayUsername = value.replace('https://tiktok.com/', '').replace('@', '');

  const formatCount = (num) => {
    if (typeof num !== 'number' || isNaN(num)) return null;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M+`;
    if (num >= 1000) return `${Math.floor(num / 1000)}k+`;
    return `${num}`;
  };
  const displayCount = formatCount(count);
  const aboutText = displayCount ? `${displayCount} подписчиков` : 'Профиль TikTok';
  
  const tiktokColor1 = '#ff0050';
  const tiktokColor2 = '#00f2ea';

  return (
    <div 
      className={`${styles.wrapper} ${className || ''}`}
      style={{
        '--color': tiktokColor1,
        '--color-1': tiktokColor1,
        '--color-2': tiktokColor2,
      }}
    >
      <div className={styles.tooltipContainer}>
        <div className={styles.tooltip}>
          <div className={styles.profile}>
            <div className={styles.user}>
              <div className={styles.img}>TT</div>
              <div className={styles.details}>
                <div className={styles.name}>TikTok</div>
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
                 <FaTiktok className={styles.svg} /> 
              </span>
            </div>
            <div className={styles.textLabel}>TikTok</div>
          </a>
        </div>
      </div>
    </div>
  );
}

export default TiktokButton; 