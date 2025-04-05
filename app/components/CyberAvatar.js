// TODO: Реализовать компонент CyberAvatar
// Временная заглушка
'use client';
import React, { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import styles from './CyberAvatar.module.css';

const CyberAvatar = ({ src, alt, size = 'md', className, priority, onError }) => {
  const containerRef = useRef(null);
  const cardRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(src || '/images/default_avatar.png');
  const [hasError, setHasError] = useState(false);

  const sizeMap = {
    sm: 40,
    md: 80,
    lg: 120,
    xl: 150,
  };
  const width = sizeMap[size] || 80;
  const height = width;

  // Обновляем imgSrc, если пропс src изменился
  useEffect(() => {
    setImgSrc(src || '/images/default_avatar.png');
    setHasError(false); // Сбрасываем ошибку при смене src
  }, [src]);

  // Обработчик ошибок загрузки изображения
  const handleImageError = () => {
    if (onError) {
      onError(); // Вызываем внешний обработчик, если передан
    }
    setImgSrc('/images/default_avatar.png'); // Устанавливаем дефолтный аватар
    setHasError(true);
  };

  // useEffect для 3D-эффекта при наведении
  useEffect(() => {
    const container = containerRef.current;
    const card = cardRef.current;
    
    if (!container || !card) return;
    
    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const percentX = (x - centerX) / centerX;
      const percentY = (y - centerY) / centerY;
      
      const rotateX = -percentY * 10; // Наклон по X
      const rotateY = percentX * 10;  // Наклон по Y
      
      // Применяем трансформацию и яркость
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      card.style.filter = `brightness(${1 + Math.abs(percentX) * 0.1 + Math.abs(percentY) * 0.1})`; 
    };
    
    const handleMouseLeave = () => {
      // Возвращаем карточку в исходное положение
      card.style.transition = 'transform 500ms ease, filter 500ms ease';
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
      card.style.filter = 'brightness(1)';
      
      // Сбрасываем transition после возврата
      setTimeout(() => {
        if (card) { 
           card.style.transition = 'transform 150ms ease, filter 150ms ease';
        }
      }, 500);
    };
    
    // Устанавливаем начальный transition
    card.style.transition = 'transform 150ms ease, filter 150ms ease';

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    
    // Очистка
    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []); // Пустой массив зависимостей, эффект запускается один раз

  return (
    <div 
      ref={containerRef} 
      className={className} // Передаем внешний класс
      style={{ width: `${width}px`, height: `${height}px`, position: 'relative' }} // Задаем размер и позицию
    >
      {/* Элементы рамки */} 
      <div className={styles.poda}>
          <div className={styles.glow}></div>
          <div className={styles.white}></div>
          <div className={styles.darkBorderBg}></div>
      </div>
      
      {/* Основная карточка с 3D-эффектом */} 
      <div ref={cardRef} className={styles.card}>
        {/* Контейнер для изображения внутри карточки */} 
        <div className={styles.avatarWrapper}>
          {/* Отображаем изображение или плейсхолдер */} 
          {hasError ? (
             <div className={styles.placeholderAvatar} style={{ '--avatar-size': `${width}px` }}>
                {alt ? alt.charAt(0).toUpperCase() : '?'}
             </div>
          ) : (
            <Image
              src={imgSrc}
              alt={alt}
              width={width - 10} // Вычитаем отступы рамки
              height={height - 10}
              priority={priority}
              onError={handleImageError} 
              className={styles.avatarImage}
              style={{ objectFit: 'cover' }} // Гарантируем заполнение
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CyberAvatar; 