'use client';

import React from 'react';
import styles from './SynthwaveButton.module.css';

/**
 * Компонент стилизованной кнопки в стиле синтвейв
 * @param {object} props - Свойства компонента
 * @param {string} props.text - Текст кнопки
 * @param {function} props.onClick - Функция обработчик клика
 * @param {boolean} props.isActive - Активное состояние кнопки (например, подписка активна)
 */
const SynthwaveButton = ({ text = 'ПОСЛЕДОВАТЬ', onClick, isActive = false }) => {
  return (
    <div className={styles.synthwaveButtonWrapper}>
      <button 
        className={`${styles.synthwaveBtn} ${isActive ? styles.active : ''}`}
        onClick={onClick}
      >
        <div className={styles.synthwaveBtnGlitchMask}>
          <span className={styles.synthwaveBtnText}>{isActive ? 'ОТПИСАТЬСЯ' : text}</span>
          <span className={styles.synthwaveBtnTextGlitch}>{isActive ? 'ОТПИСАТЬСЯ' : text}</span>
        </div>
        <div className={styles.synthwaveBtnScanlines} />
        <div className={styles.synthwaveBtnGlow} />
        <div className={styles.synthwaveBtnGrid} />
        <div className={styles.synthwaveBtnBorders} />
        <div className={styles.synthwaveStars}>
          <div className={styles.star} />
          <div className={styles.star} />
          <div className={styles.star} />
          <div className={styles.star} />
          <div className={styles.star} />
        </div>
        <div className={styles.synthwaveFlare} />
        <div className={styles.synthwaveNoise} />
        <div className={styles.synthwaveCircles} />
      </button>
    </div>
  );
}

export default SynthwaveButton; 