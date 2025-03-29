'use client';

import React, { useRef, useEffect } from 'react';
import Image from 'next/image';
import styles from './CyberAvatar.module.css';

/**
 * Компонент стилизованной аватарки с 3D эффектом
 * @param {object} props - Свойства компонента
 * @param {string} props.imageUrl - URL изображения аватарки
 * @param {string} props.src - Альтернативный prop для URL изображения аватарки
 * @param {string} props.alt - Альтернативный текст для изображения
 * @param {number} props.size - Размер аватарки (по умолчанию 190px)
 */
const CyberAvatar = ({ imageUrl, src, alt, size = 190 }) => {
  const containerRef = useRef(null);
  const cardRef = useRef(null);
  
  // Используем либо imageUrl, либо src параметр
  const imageSrc = imageUrl || src || '/default-avatar.png';
  
  useEffect(() => {
    const container = containerRef.current;
    const card = cardRef.current;
    
    if (!container || !card) return;
    
    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left; // Позиция X курсора относительно контейнера
      const y = e.clientY - rect.top;  // Позиция Y курсора относительно контейнера
      
      // Вычисляем положение курсора в процентах от размеров контейнера
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      // Расстояние от центра в процентах (-50% до 50%)
      const percentX = (x - centerX) / centerX;
      const percentY = (y - centerY) / centerY;
      
      // Ограничиваем вращение до 10 градусов в каждом направлении
      const rotateX = -percentY * 10; // Инвертируем Y для правильного эффекта наклона
      const rotateY = percentX * 10;
      
      // Применяем трансформацию
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      card.style.filter = `brightness(${1 + Math.abs(percentX) * 0.2 + Math.abs(percentY) * 0.2})`;
      
      // Активируем эффекты частиц и свечения при наведении
      const glowElements = card.querySelectorAll(`.${styles.glowingElements} div`);
      glowElements.forEach(el => {
        el.style.opacity = '1';
      });
      
      const particles = card.querySelectorAll(`.${styles.cardParticles} span`);
      particles.forEach(particle => {
        particle.style.animation = 'particleFloat 2s infinite';
      });
    };
    
    const handleMouseLeave = () => {
      // Возвращаем карточку в исходное положение с анимацией
      card.style.transition = 'transform 500ms ease, filter 500ms ease';
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
      card.style.filter = 'brightness(1)';
      
      // Деактивируем эффекты при уходе курсора
      const glowElements = card.querySelectorAll(`.${styles.glowingElements} div`);
      glowElements.forEach(el => {
        el.style.opacity = '0';
      });
      
      const particles = card.querySelectorAll(`.${styles.cardParticles} span`);
      particles.forEach(particle => {
        particle.style.animation = 'none';
      });
      
      // Сбрасываем transition после возврата в исходное положение
      setTimeout(() => {
        card.style.transition = 'transform 150ms ease, filter 150ms ease';
      }, 500);
    };
    
    // Настраиваем плавность перехода при движении мыши
    card.style.transition = 'transform 150ms ease, filter 150ms ease';
    
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);
  
  return (
    <div className={styles.cyberAvatarWrapper} style={{ width: `${size}px`, height: `${size * 1.32}px` }}>
      <div className={styles.container} ref={containerRef}>
        <div className={styles.canvas}>
          <div id="card" className={styles.card} ref={cardRef}>
            <div className={styles.cardContent}>
              <div className={styles.cardGlare} />
              <div className={styles.cyberLines}>
                <span /><span /><span /><span />
              </div>
              <div className={styles.avatarImage}>
                <Image 
                  src={imageSrc} 
                  alt={alt || 'Аватар'} 
                  layout="fill" 
                  objectFit="cover"
                />
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