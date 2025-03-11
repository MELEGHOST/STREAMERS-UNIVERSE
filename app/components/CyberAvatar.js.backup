'use client';

import React from 'react';
import styles from './CyberAvatar.module.css';

/**
 * Компонент стилизованной аватарки с 3D эффектом
 * @param {object} props - Свойства компонента
 * @param {string} props.imageUrl - URL изображения аватарки
 * @param {string} props.alt - Альтернативный текст для изображения
 * @param {number} props.size - Размер аватарки (по умолчанию 190px)
 */
const CyberAvatar = ({ imageUrl, alt, size = 190 }) => {
  return (
    <div className={styles.cyberAvatarWrapper} style={{ width: `${size}px`, height: `${size * 1.32}px` }}>
      <div className={styles.container}>
        <div className={styles.canvas}>
          <div className={styles.tracker + ' ' + styles.tr1} />
          <div className={styles.tracker + ' ' + styles.tr2} />
          <div className={styles.tracker + ' ' + styles.tr3} />
          <div className={styles.tracker + ' ' + styles.tr4} />
          <div className={styles.tracker + ' ' + styles.tr5} />
          <div className={styles.tracker + ' ' + styles.tr6} />
          <div className={styles.tracker + ' ' + styles.tr7} />
          <div className={styles.tracker + ' ' + styles.tr8} />
          <div className={styles.tracker + ' ' + styles.tr9} />
          <div id="card" className={styles.card}>
            <div className={styles.cardContent}>
              <div className={styles.cardGlare} />
              <div className={styles.cyberLines}>
                <span /><span /><span /><span />
              </div>
              <div className={styles.avatarImage}>
                <img src={imageUrl || '/default-avatar.png'} alt={alt || 'Аватар'} />
              </div>
              <div className={styles.glowingElements}>
                <div className={styles.glow1} />
                <div className={styles.glow2} />
                <div className={styles.glow3} />
              </div>
              <div className={styles.cardParticles}>
                <span /><span /><span /><span /><span /><span />
              </div>
              <div className={styles.cornerElements}>
                <span /><span /><span /><span />
              </div>
              <div className={styles.scanLine} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CyberAvatar; 