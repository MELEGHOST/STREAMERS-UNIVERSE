'use client';

import React from 'react';
import styled from 'styled-components';

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
  } catch { /* Оставляем 'Профиль/Трек' */ }

  // Форматируем count (если он есть и число)
  const formatCount = (num) => {
    if (typeof num !== 'number' || isNaN(num)) return null;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M+`;
    if (num >= 1000) return `${Math.floor(num / 1000)}k+`;
    return `${num}`;
  };
  const displayCount = formatCount(count);
  const aboutText = displayCount ? `${displayCount} слушателей` : 'Яндекс Музыка'; // Текст по умолчанию

  return (
    <StyledWrapper className={className}>
      <div className="tooltip-container">
        <div className="button-group"> {/* Отличается от других */} 
          <div className="tooltip">
            <div className="profile">
              <div className="user">
                <div className="img">Ya</div>
                <div className="details">
                  <div className="name">Яндекс Музыка</div>
                  <div className="username">{displayUsername}</div>
                </div>
              </div>
              <div className="about">{aboutText}</div>
            </div>
          </div>
          <div className="text"> 
            <a href={href} target="_blank" rel="noopener noreferrer" className="icon">
              <div className="layer">
                <span />
                <span />
                <span />
                <span />
                <span className="svg">
                  <svg version="1.1" id="Слой_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="8 8 60 60" xmlSpace="preserve">
                    <rect x={0} y={0} width={0} height={0} rx={0} ry={0} fill="#212121" />
                    <path id="star" markerStart="none" markerEnd="none" style={{fill: 'currentColor'}} d="M39.2,20.019l-0.129-0.607l-5.097-0.892l2.968-4.021
              L36.6,14.104l-4.364,2.104l0.552-5.573l-0.447-0.261l-2.655,4.52l-2.971-6.728h-0.524l0.709,6.491l-7.492-6.019l-0.631,0.184
              l5.757,7.281l-11.407-3.812l-0.527,0.58L22.8,18.705L8.739,19.887l-0.157,0.868l14.612,1.601L10.999,32.504l0.527,0.708
              l14.508-7.937l-2.864,13.984h0.868l5.569-13.168L33,36.392l0.603-0.473L32.212,25.46l5.28,6.019l0.341-0.555l-4.045-7.463
              l5.649,2.103l0.053-0.631l-5.072-3.76L39.2,20.019z" />
                  </svg>
                </span>
              </div>
               {/* Используем btn-text вместо text у других кнопок */}
              <div className="btn-text">Яндекс Музыка</div>
            </a>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
}

// Стили из твоего кода YandexMusic
const StyledWrapper = styled.div`
  display: inline-block;
  vertical-align: middle;
  margin: 0 5px;

  .tooltip-container {
    --color: #ffdb00; /* Желтый цвет Яндекс Музыки */
    --border: rgba(255, 221, 0, 0.25); /* Прозрачный желтый цвет для границы */
    position: relative;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 17px;
    border-radius: 10px;
  }

  .button-group { /* Отличается от других */
    position: relative;
  }

  .tooltip {
    position: absolute;
    bottom: 100%; /* Позиционируем над кнопкой */
    left: 50%;
    transform: translateX(-50%) translateY(-10px);
    padding: 10px;
    opacity: 0;
    pointer-events: none;
    transition: all 0.3s;
    border-radius: 15px;
    box-shadow:
      inset 5px 5px 5px rgba(0, 0, 0, 0.2),
      inset -5px -5px 15px rgba(255, 255, 255, 0.1),
      5px 5px 15px rgba(0, 0, 0, 0.3),
      -5px -5px 15px rgba(255, 255, 255, 0.1);
    z-index: 10;
    visibility: hidden;
  }

  .profile {
    background: rgba(255, 223, 0, 0.1); /* Фоновый цвет с прозрачностью */
    border-radius: 10px 15px;
    padding: 10px;
    border: 1px solid var(--border);
    min-width: 180px;
    text-align: left;
  }

  /* Показываем tooltip */
  .tooltip-container:hover .tooltip {
     opacity: 1;
     visibility: visible;
     pointer-events: auto;
     transform: translateX(-50%) translateY(-15px);
   }

  .icon {
    text-decoration: none;
    color: #ffffff; /* Цвет текста внутри кнопки */
    display: block;
    position: relative;
  }

  .layer {
    width: 50px; /* Уменьшил размер */
    height: 50px; /* Уменьшил размер */
    transition: transform 0.3s;
  }

  .icon:hover .layer {
    transform: rotate(-35deg) skew(20deg);
  }

  .layer span {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    border: 2px solid #ffffff;
    border-radius: 50%;
    transition: all 0.3s;
    background: #212121; /* Черный фон по умолчанию */
    box-shadow:
      inset 5px 5px 5px rgba(0, 0, 0, 0.2),
      inset -5px -5px 15px rgba(255, 255, 255, 0.1),
      5px 5px 15px rgba(0, 0, 0, 0.2),
      -5px -5px 10px rgba(255, 255, 255, 0.05);
     display: flex;
     align-items: center;
     justify-content: center;
  }

 .layer span.svg {
      padding: 0;
  }

  .layer span.svg svg {
      width: 60%;
      height: 60%;
  }

  .tooltip-container:hover .layer span {
    border-radius: 10px;
    background: var(--color); /* Желтый фон при ховере */
  }

  .layer span,
  .btn-text { /* Используется btn-text */
    color: var(--color); /* Желтый цвет текста и рамки */
    border-color: var(--color);
  }

  .icon:hover .layer span {
    box-shadow: -1px 1px 3px var(--color);
  }

  .icon .btn-text { /* Используется btn-text */
    position: absolute;
    left: 50%;
    bottom: -5px;
    opacity: 0;
    font-weight: 700;
    transform: translateX(-50%);
    transition:
      bottom 0.3s ease,
      opacity 0.3s ease;
     white-space: nowrap;
     color: var(--color);
     font-size: 0.8em;
  }

  .icon:hover .btn-text {
    bottom: -30px;
    opacity: 1;
  }

  /* Анимация слоев */
  .icon:hover .layer span:nth-child(1) {
    opacity: 0.2;
  }
  .icon:hover .layer span:nth-child(2) {
    opacity: 0.4;
    transform: translate(3px, -3px);
  }
  .icon:hover .layer span:nth-child(3) {
    opacity: 0.6;
    transform: translate(6px, -6px);
  }
  .icon:hover .layer span:nth-child(4) {
    opacity: 0.8;
    transform: translate(9px, -9px);
  }
  .icon:hover .layer span:nth-child(5) {
    opacity: 1;
    transform: translate(12px, -12px);
  }

  /* Базовый цвет звезды */
  .svg #star {
    fill: var(--color);
    transition: fill 0.3s ease;
  }

  /* При наведении на кнопку - звезда черная */
  .tooltip-container:hover #star {
    fill: #212121 !important; /* !important чтобы перебить базовый */
  }

  /* При наведении на tooltip - звезда черная */
   .tooltip-container:hover .tooltip ~ .text #star {
       fill: #212121 !important;
   }

  /* Стили тултипа */
  .user {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  .img {
    width: 40px;
    height: 40px;
    font-size: 18px;
    font-weight: 700;
    border: 1px solid var(--border);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    color: var(--color);
    flex-shrink: 0;
  }
  .name {
    font-size: 1em;
    font-weight: 700;
    color: #ffffff;
    margin: 0;
  }
  .details {
    display: flex;
    flex-direction: column;
    gap: 0;
    color: var(--color);
  }
  .username {
    font-size: 0.8em;
    color: #ccc;
    margin: 0;
    word-break: break-all;
  }
  .about {
    color: rgba(255, 255, 255, 0.7);
    padding-top: 8px;
    font-size: 0.8em;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    margin-top: 8px;
  }
`;

export default YandexMusicButton; 