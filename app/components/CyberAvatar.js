'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
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
const CyberAvatar = ({ 
  imageUrl = null, 
  src = null, 
  alt = 'User avatar', 
  size = 96,
  className = '',
  onClick,
  isInteractive = false
}) => {
  const containerRef = useRef(null);
  const cardRef = useRef(null);
  
  // Используем состояние для отслеживания ошибок загрузки
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Определяем источник изображения: приоритет отдаем props src, затем imageUrl
  const imageSrc = src || imageUrl || null;
  
  // Обработчик ошибок загрузки изображения
  const handleError = useCallback((error) => {
    console.error('[CyberAvatar] Error loading image:', imageSrc);
    setImageError(true);
  }, [imageSrc]);
  
  // Обработчик успешной загрузки
  const handleLoadComplete = useCallback(() => {
    console.log('[CyberAvatar] Loading complete for:', imageSrc);
    setImageLoaded(true);
  }, [imageSrc]);
  
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
  
  // Если источник не определен или произошла ошибка загрузки, возвращаем пустой div с классом аватара
  if (!imageSrc || imageError) {
    return (
      <div 
        className={`${styles.avatarPlaceholder} ${className} ${isInteractive ? styles.interactive : ''}`}
        style={{ 
          width: size, 
          height: size,
          borderRadius: '50%', 
          backgroundColor: '#4A5568',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.5,
          color: '#CBD5E0'
        }}
        onClick={onClick}
      >
        {/* Можно добавить инициалы или иконку placeholder */}
        <span>{alt.charAt(0).toUpperCase()}</span>
      </div>
    );
  }
  
  // Рендерим аватар
  return (
    <div 
      className={`${styles.avatar} ${className} ${isInteractive ? styles.interactive : ''}`}
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      <Image
        src={imageSrc}
        alt={alt}
        width={size}
        height={size}
        className={styles.avatarImage}
        onError={handleError}
        onLoadingComplete={handleLoadComplete}
        priority={true}
      />
    </div>
  );
};

export default CyberAvatar;