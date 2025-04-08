import React from 'react';
import styled from 'styled-components';
import Link from 'next/link'; // Используем Link из Next.js

// --- Конфигурация платформ ---
const platformData = {
  vk: {
    color: '#4a76a8',
    label: 'VK',
    iconLetter: 'V',
    tooltipName: 'VKontakte',
    tooltipDetail: 'Профиль/Сообщество',
    // SVG Path для VK (примерный, может потребоваться viewBox="0 0 24 24" или другой)
    svgPath: 'M13.16 12.233c.827 0 .996-.5 .996-1.547v-2.172c0-.813-.17-1.37-.996-1.37-.827 0-1.16.557-1.16 1.37v2.172c0 1.047.333 1.547 1.16 1.547zm-6.09-6.833h1.854c.094 1.872.94 2.924 2.08 2.924.996 0 1.547-.514 1.547-1.327 0-2.41-4.086-2.58-4.086-5.14 0-1.702 1.16-2.754 3.044-2.754 1.16 0 2.08.47 2.81 1.413l-1.453.94c-.47-.606-.996-1.04-1.546-1.04-.557 0-.887.334-.887.887 0 2.08 4.086 2.204 4.086 4.854 0 1.04-.557 2.08-2.58 2.08-1.796 0-2.76-.996-3.26-2.367h-1.59zm10.684 6.36c-.28.186-.7.42-1.114.42-.7 0-.793-.373-.793-1.027v-4.466h-1.697v4.94c0 1.547.84 2.08 1.797 2.08.7 0 1.16-.373 1.697-.887v.793h1.697v-5.186h-1.587v3.334z',
    viewBox: '0 0 24 24' // Стандартный viewBox
  },
  twitch: {
    color: '#9146ff',
    label: 'Twitch',
    iconLetter: 'T',
    tooltipName: 'Twitch',
    tooltipDetail: 'Канал на Twitch',
    // SVG Path для Twitch (ViewBox 0 0 24 24)
    svgPath: 'M2.149 0l-1.612 4.119v16.836h5.731v3.045h3.224l3.045-3.045h4.657l6.269-6.269v-14.686h-21.314zm19.164 13.612l-3.582 3.582h-5.731l-3.045 3.045v-3.045h-4.836v-15.045h17.194v11.463zm-3.582-7.343v6.262h-2.149v-6.262h2.149zm-5.731 0v6.262h-2.149v-6.262h2.149z',
    viewBox: '0 0 24 24' // Стандартный viewBox
  },
  discord: {
    color: '#5865f2',
    label: 'Discord',
    iconLetter: 'D',
    tooltipName: 'Discord',
    tooltipDetail: 'Профиль/Сервер',
    // SVG Path для Discord (примерный, viewBox="0 0 24 24")
    svgPath: 'M20.317 4.369a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037 18.082 18.082 0 00-1.077 1.615 18.433 18.433 0 00-4.885 0 18.082 18.082 0 00-1.077-1.615.074.074 0 00-.079-.037A19.736 19.736 0 003.683 4.37a.074.074 0 00-.034.044 21.446 21.446 0 00-.651 6.29c0 6.173 4.098 11.539 9.996 11.539s9.996-5.366 9.996-11.539a21.446 21.446 0 00-.651-6.29.074.074 0 00-.034-.044zm-6.321 9.808a2.413 2.413 0 11-2.413-2.413 2.413 2.413 0 012.413 2.413zm-4.825 0a2.413 2.413 0 11-2.413-2.413 2.413 2.413 0 012.413 2.413z',
    viewBox: '0 0 24 24' // Стандартный viewBox
  },
  youtube: {
    color: '#ff0000',
    label: 'YouTube',
    iconLetter: 'Y',
    tooltipName: 'YouTube',
    tooltipDetail: 'Канал на YouTube',
    // SVG Path для YouTube (ViewBox="0 0 24 24")
    svgPath: 'M219.044,391.269916 L219.0425,377.687742 L232.0115,384.502244 L219.044,391.269916 Z M247.52,375.334163 C247.52,375.334163 247.0505,372.003199 245.612,370.536366 C243.7865,368.610299 241.7405,368.601235 240.803,368.489448 C234.086,368 224.0105,368 224.0105,368 L223.9895,368 C223.9895,368 213.914,368 207.197,368.489448 C206.258,368.601235 204.2135,368.610299 202.3865,370.536366 C200.948,372.003199 200.48,375.334163 200.48,375.334163 C200.48,375.334163 200,379.246723 200,383.157773 L200,386.82561 C200,390.73817 200.48,394.64922 200.48,394.64922 C200.48,394.64922 200.948,397.980184 202.3865,399.447016 C204.2135,401.373084 206.612,401.312658 207.68,401.513574 C211.52,401.885191 224,402 224,402 C224,402 234.086,401.984894 240.803,401.495446 C241.7405,401.382148 243.7865,401.373084 245.612,399.447016 C247.0505,397.980184 247.52,394.64922 247.52,394.64922 C247.52,394.64922 248,390.73817 248,386.82561 L248,383.157773 C248,379.246723 247.52,375.334163 247.52,375.334163 L247.52,375.334163 Z',
    viewBox: '200 -7 48 48' // viewBox из твоего примера
  },
  yandex_music: {
    color: '#ffdb4d',
    label: 'Я.Музыка',
    iconLetter: 'Я',
    tooltipName: 'Яндекс Музыка',
    tooltipDetail: 'Профиль музыканта',
    // SVG Path для Яндекс.Музыки (треугольник)
    svgPath: 'M119.413 82.493L45.264 128.838V36.147l74.149 46.346z',
    viewBox: '0 0 165 165' // Используем оригинальный viewBox
  },
  default: {
    color: 'var(--foreground-secondary)',
    label: 'Link',
    iconLetter: 'L',
    tooltipName: 'Ссылка',
    tooltipDetail: 'Внешний ресурс',
    svgPath: 'M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm0 22c-5.514 0-10-4.486-10-10s4.486-10 10-10 10 4.486 10 10-4.486 10-10 10zm5-10h-4v-4h-2v4h-4v2h4v4h2v-4h4v-2z', // Пример иконки ссылки
    viewBox: '0 0 24 24'
  }
};
// --------------------------------

const StyledSocialButton = ({ platform, url }) => {
  const config = platformData[platform] || platformData.default;

  // Проверка URL (оставляем как было)
  let finalUrl = url;
  if (typeof url === 'string' && url && !url.startsWith('http') && !url.startsWith('//')) {
      if (platform !== 'discord' || url.includes('discord.gg') || url.includes('.com')) {
          // Для дискорда без http добавлять не будем
      } else {
          finalUrl = '#'; // Если дискорд без http, делаем ссылку-заглушку
      }
  } else if (!url || typeof url !== 'string') {
     console.warn(`[StyledSocialButton] Invalid URL for ${platform}:`, url);
     return null;
  }

  // Определяем, нужно ли делать ссылку активной
  const isLinkActive = platform !== 'discord' || (typeof finalUrl === 'string' && finalUrl.startsWith('http'));

  return (
    <StyledWrapper style={{ '--color': config.color }}>
      <div className="tooltip-container">
        <div className="tooltip">
          <div className="profile">
            <div className="user">
              <div className="img">{config.iconLetter}</div>
              <div className="details">
                <div className="name">{config.tooltipName}</div>
                <div className="username">{config.label}</div>
              </div>
            </div>
            <div className="about">{config.tooltipDetail}</div>
          </div>
        </div>
        <div className="text-wrapper"> { /* Переименовал обертку для ясности */}
          {/* Используем Link или span в зависимости от isLinkActive */}
          {isLinkActive ? (
            <Link href={finalUrl} target="_blank" rel="noopener noreferrer" className="icon">
              <ButtonContent config={config} />
            </Link>
          ) : (
            <span className="icon" title={`Discord: ${url}`}>
              <ButtonContent config={config} />
            </span>
          )}
        </div>
      </div>
    </StyledWrapper>
  );
}

// Выносим повторяющееся содержимое кнопки в отдельный компонент
const ButtonContent = ({ config }) => (
  <>
    <div className="layer">
      <span />
      <span />
      <span />
      <span />
      <span className="svg-container">
        <svg
          xmlnsXlink="http://www.w3.org/1999/xlink"
          xmlns="http://www.w3.org/2000/svg"
          version="1.1"
          viewBox={config.viewBox || '0 0 24 24'}
          className="svg-icon"
        >
          {config.svgPath ? (
             <path d={config.svgPath} />
          ) : (
             <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="14" fill="currentColor">{config.iconLetter}</text>
          )}
        </svg>
      </span>
    </div>
    <div className="text-label">{config.label}</div> { /* Класс для текста под иконкой */}
  </>
);

// --- Стили styled-components --- 
const StyledWrapper = styled.div`
  /* Базовые стили контейнера и тултипа (как в примерах) */
  .tooltip-container {
    --color: ${props => props.style?.['--color'] || '#ccc'}; /* Берем цвет из inline style */
    --border: hsla(from var(--color) h s l / 0.25);
    position: relative;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 17px;
    border-radius: 10px; /* У тултипа */
  }

  .tooltip {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px;
    opacity: 0;
    pointer-events: none;
    transition: all 0.3s;
    border-radius: 15px;
    background: rgba(40, 40, 40, 0.85); /* Полупрозрачный темный фон тултипа */
    backdrop-filter: blur(5px);
    box-shadow:
      0 5px 15px rgba(0, 0, 0, 0.3);
    width: max-content;
    min-width: 180px;
    z-index: 10; /* Чтобы тултип был поверх */
  }

  .profile {
    border-radius: 10px 15px;
    padding: 10px;
    border: 1px solid var(--border);
    background: transparent; /* Убираем фон */
  }

  .tooltip-container:hover .tooltip {
    top: -135px; /* Позиция тултипа */
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }
  
  /* Стили самой иконки-ссылки */
  .icon {
    text-decoration: none;
    color: inherit; /* Наследуем цвет */
    display: block;
    position: relative;
  }
  
  /* Стили слоя анимации */
  .layer {
    width: 55px; /* Фиксированный размер кнопки */
    height: 55px;
    transition: transform 0.3s;
    position: relative; /* Для позиционирования svg-container */
  }
  .icon:hover .layer {
    transform: rotate(-35deg) skew(20deg);
  }
  
  /* Стили каждого слоя span (для эффекта) */
  .layer span {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    border: 1px solid var(--color); /* Тонкая цветная рамка */
    border-radius: 50%; /* Всегда круглые */
    transition: all 0.3s;
    background: #fff; /* Белый фон кнопки */
  }
  
  /* Эффект слоев при наведении */
  .icon:hover .layer span:not(.svg-container) {
     box-shadow: -1px 1px 3px hsla(from var(--color) h s l / 0.5); 
  }
  .icon:hover .layer span:nth-child(1) {
    opacity: 0.15;
  }
  .icon:hover .layer span:nth-child(2) {
    opacity: 0.3;
    transform: translate(3px, -3px);
  }
  .icon:hover .layer span:nth-child(3) {
    opacity: 0.45;
    transform: translate(6px, -6px);
  }
  .icon:hover .layer span:nth-child(4) {
    opacity: 0.6;
    transform: translate(9px, -9px);
  }
  .icon:hover .layer span.svg-container {
    opacity: 1;
    transform: translate(12px, -12px); /* Пятый слой (иконка) смещается больше всех */
    box-shadow: 
      inset 2px 2px 3px rgba(255, 255, 255, 0.6),
      inset -2px -2px 3px rgba(0, 0, 0, 0.2),
      2px 2px 5px rgba(0, 0, 0, 0.2);
  }
  
  /* Контейнер для SVG внутри последнего слоя */
  .layer span.svg-container {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px; /* Отступы внутри кнопки */
    overflow: hidden; /* Обрезаем SVG, если он больше */
    box-shadow:
      inset 3px 3px 5px rgba(0, 0, 0, 0.1),
      inset -3px -3px 5px rgba(255, 255, 255, 0.7);
  }
  
  /* Стили самого SVG */
  .svg-icon {
     width: 100%;
     height: 100%;
     transition: fill 0.2s ease;
  }
  .svg-icon path {
      fill: var(--color); /* Заливка цветом платформы */
      transition: fill 0.2s ease;
  }
  
  .icon:hover .svg-icon path {
      fill: #fff; /* При наведении делаем иконку белой */
  }
  .icon:hover .layer span.svg-container {
      background: var(--color); /* Фон кнопки при наведении меняется на цвет платформы */
      border-color: transparent; /* Убираем рамку при наведении */
  }

  /* Стили текста под иконкой */
  .text-label {
    position: absolute;
    left: 50%;
    bottom: -10px; /* Немного ниже */
    opacity: 0;
    font-weight: 500;
    font-size: 12px; /* Мельче */
    color: var(--secondary-text-color); /* Используем переменную темы */
    transform: translateX(-50%);
    transition:
      bottom 0.3s ease,
      opacity 0.3s ease;
    white-space: nowrap;
    pointer-events: none; /* Чтобы не мешал */
  }
  .icon:hover .text-label {
    bottom: -25px;
    opacity: 1;
  }

  /* Стили тултипа (как в примерах) */
  .user {
    display: flex;
    gap: 10px;
  }
  .img {
    width: 50px;
    height: 50px;
    font-size: 25px;
    font-weight: 700;
    border: 1px solid var(--border);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    color: var(--color);
  }
  .name {
    font-size: 17px;
    font-weight: 700;
    color: #fff; /* Белый цвет имени */
  }
  .details {
    display: flex;
    flex-direction: column;
    gap: 0;
    color: var(--color);
  }
  .username {
      font-size: 14px;
      color: #aaa; /* Серый цвет юзернейма */
  }
  .about {
    color: #ccc;
    padding-top: 5px;
    font-size: 13px;
  }
`;

export default StyledSocialButton; 