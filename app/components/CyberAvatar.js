'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import styles from './CyberAvatar.module.css';

/**
 * Компонент стилизованной аватарки с 3D эффектом
 * @param {object} props - Свойства компонента
 * @param {string} props.src - URL изображения аватарки
 * @param {string} props.alt - Альтернативный текст для изображения
 * @param {string|number} props.size - Размер аватарки (xs, sm, md, lg, xl или число в пикселях)
 * @param {string} props.className - Дополнительные CSS классы
 * @param {string} props.layout - Тип компоновки Next.js Image ('fixed', 'responsive', 'fill')
 * @param {number} props.width - Ширина изображения (для layout='fixed')
 * @param {number} props.height - Высота изображения (для layout='fixed')
 * @param {boolean} props.priority - Приоритетная загрузка изображения
 * @param {Function} props.onError - Функция обратного вызова при ошибке загрузки
 */
const CyberAvatar = ({ 
  src, 
  alt = "Аватар", 
  size = "md", 
  className = "", 
  layout = "responsive",
  width,
  height,
  priority = false,
  onError
}) => {
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState("/images/default_avatar.png");
  
  // Определяем размеры на основе prop size
  const getSizeInPixels = () => {
    const sizeMap = {
      'xs': 30,
      'sm': 50,
      'md': 80,
      'lg': 100,
      'xl': 150
    };
    
    if (typeof size === 'number') {
      return size;
    }
    
    return sizeMap[size] || sizeMap.md;
  };
  
  const sizeInPixels = getSizeInPixels();
  
  // Обновляем src, когда prop src изменяется
  useEffect(() => {
    if (src) {
      setImageSrc(src);
      setError(false); // Сбрасываем состояние ошибки при изменении src
    } else {
      // Если src не предоставлен, используем изображение по умолчанию
      setImageSrc("/images/default_avatar.png");
    }
  }, [src]);
  
  // Обработчик ошибки загрузки изображения
  const handleImageError = () => {
    console.warn(`CyberAvatar: Ошибка загрузки изображения: ${src}`);
    setError(true);
    setImageSrc("/images/default_avatar.png");
    
    // Вызываем пользовательский обработчик ошибок, если он предоставлен
    if (typeof onError === 'function') {
      onError();
    }
  };
  
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
  
  // Компонент изображения с различными размерами для различных макетов
  const renderImage = () => {
    // Передаем alt напрямую, чтобы удовлетворить линтер
    const baseImgProps = {
      src: error ? "/images/default_avatar.png" : imageSrc,
      className: styles.avatarImage,
      onError: handleImageError,
      priority: priority
    };
    
    if (layout === 'fixed') {
      return (
        <Image 
          {...baseImgProps}
          alt={alt}
          width={width || sizeInPixels}
          height={height || sizeInPixels}
          layout="fixed"
        />
      );
    } else if (layout === 'fill') {
      return (
        <Image 
          {...baseImgProps}
          alt={alt}
          layout="fill" 
          objectFit="cover" 
        />
      );
    } else {
      // По умолчанию используем 'responsive'
      return (
        <Image 
          {...baseImgProps}
          alt={alt}
          width={100}
          height={100}
          layout="responsive"
        />
      );
    }
  };

  return (
    <div 
      className={`${styles.profileAvatarContainer} ${className}`}
      style={{ '--avatar-size': `${width || sizeInPixels}px` }} 
      data-size={size}
    >
      <div className={styles.poda}>
        <div className={styles.glow} />
        <div className={styles.darkBorderBg} />
        <div className={styles.white} />
        <div className={styles.border} />
        
        <div className={styles.avatarWrapper}>
          {renderImage()}
        </div>
      </div>
    </div>
  );
};

export default CyberAvatar;