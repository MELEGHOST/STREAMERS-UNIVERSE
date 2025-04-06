import React from 'react';
import styled from 'styled-components';
import Link from 'next/link'; // Используем Link из Next.js

// --- Конфигурация платформ ---
const platformData = {
  vk: {
    color: '#4a76a8',
    label: 'VK',
    iconLetter: 'V', // Вместо SVG
    tooltipName: 'VKontakte',
    tooltipDetail: 'Профиль/Сообщество',
    // svgPath: 'M... (path для VK) ...' 
  },
  twitch: {
    color: '#9146ff',
    label: 'Twitch',
    iconLetter: 'T', // Вместо SVG
    tooltipName: 'Twitch',
    tooltipDetail: 'Канал на Twitch',
    svgPath: 'M2.149 0l-1.612 4.119v16.836h5.731v3.045h3.224l3.045-3.045h4.657l6.269-6.269v-14.686h-21.314zm19.164 13.612l-3.582 3.582h-5.731l-3.045 3.045v-3.045h-4.836v-15.045h17.194v11.463zm-3.582-7.343v6.262h-2.149v-6.262h2.149zm-5.731 0v6.262h-2.149v-6.262h2.149z'
  },
  discord: {
    color: '#5865f2',
    label: 'Discord',
    iconLetter: 'D', // Вместо SVG
    tooltipName: 'Discord',
    tooltipDetail: 'Профиль/Сервер',
    // svgPath: 'M... (path для Discord) ...'
  },
  youtube: {
    color: '#ff0000',
    label: 'YouTube',
    iconLetter: 'Y', // Вместо SVG
    tooltipName: 'YouTube',
    tooltipDetail: 'Канал на YouTube',
    // svgPath: 'M... (path для YouTube) ...'
  },
  yandex_music: {
    color: '#ffdb4d',
    label: 'Я.Музыка',
    iconLetter: 'Я', // Вместо SVG
    tooltipName: 'Яндекс Музыка',
    tooltipDetail: 'Профиль музыканта',
    // svgPath: 'M... (path для Яндекс Музыки) ...'
  },
  default: {
    color: 'var(--foreground-secondary)',
    label: 'Link',
    iconLetter: 'L',
    tooltipName: 'Ссылка',
    tooltipDetail: 'Внешний ресурс',
  }
};
// --------------------------------

const StyledSocialButton = ({ platform, url }) => {
  const config = platformData[platform] || platformData.default;

  // Проверка URL (оставляем как было)
  let finalUrl = url;
  if (typeof url === 'string' && url && !url.startsWith('http') && !url.startsWith('//')) {
      if (platform !== 'discord' || url.includes('discord.gg') || url.includes('.com')) {
          const prefix = platformData[platform]?.defaultUrlPrefix || ''; // Нужен префикс
          finalUrl = prefix + url;
      }
  } else if (!url || typeof url !== 'string') {
     console.warn(`[StyledSocialButton] Invalid URL for ${platform}:`, url);
     return null;
  }

  return (
    // Передаем цвет через style для CSS переменной --color
    <StyledWrapper style={{ '--color': config.color }}>
      <div className="tooltip-container">
        {/* --- Тултип --- */}
        <div className="tooltip">
          <div className="profile">
            <div className="user">
              {/* Динамическая "иконка" в тултипе */} 
              <div className="img">{config.iconLetter}</div> 
              <div className="details">
                {/* Динамическое имя и описание в тултипе */} 
                <div className="name">{config.tooltipName}</div>
                <div className="username">{config.label}</div>
              </div>
            </div>
             {/* Динамический about в тултипе */} 
            <div className="about">{config.tooltipDetail}</div>
          </div>
        </div>
        {/* --- Основная кнопка --- */}
        <div className="text"> { /* У Link нет className в Next.js < 13, используем обертку */}
          <Link href={finalUrl} target="_blank" rel="noopener noreferrer" className="icon">
            <div className="layer">
              <span />
              <span />
              <span />
              <span />
              <span className="svg">
                 {/* Динамический SVG */} 
                 <svg fill={config.color} xmlnsXlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24">
                   {config.svgPath ? (
                      <path fill="currentColor" d={config.svgPath} />
                   ) : (
                      // Фоллбэк, если SVG нет - можно просто текст
                      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="14" fill="currentColor">{config.iconLetter}</text>
                   )}
                 </svg>
              </span>
            </div>
             {/* Динамический текст под иконкой */} 
            <div className="text">{config.label}</div>
          </Link>
        </div>
      </div>
    </StyledWrapper>
  );
}

// --- Стили styled-components --- 
// Копируем твои стили сюда
const StyledWrapper = styled.div`
  /* ... твои стили .tooltip-container, .tooltip, .profile, .icon, .layer, .svg, .user, .img, .name, .details, .about ... */
  
  .tooltip-container {
    /* Используем переменную --color, переданную через style */
    /* --color: rgb(145, 70, 255); */ 
    --border: hsla(from var(--color) h s l / 0.25); /* Делаем border зависимым от основного цвета */
    position: relative;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 17px;
    border-radius: 10px;
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
    /* Используем цвет из переменной для фона */
    background: hsla(from var(--color) h s l / 0.1); 
    box-shadow:
      inset 5px 5px 5px rgba(0, 0, 0, 0.2),
      inset -5px -5px 15px rgba(255, 255, 255, 0.1),
      5px 5px 15px rgba(0, 0, 0, 0.3),
      -5px -5px 15px rgba(255, 255, 255, 0.1);
    width: max-content; /* Чтобы тултип подстраивался под контент */
    min-width: 180px; /* Минимальная ширина тултипа */
  }

  .profile {
    /* background: rgba(204, 124, 132, 0.1); */ /* Убираем старый фон */
    border-radius: 10px 15px;
    padding: 10px;
    border: 1px solid var(--border);
  }

  .tooltip-container:hover .tooltip {
    top: -150px; /* Поднимаем чуть выше */
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }

  .icon {
    text-decoration: none;
    color: #fff; /* Цвет по умолчанию для обертки иконки, не должен быть виден */
    display: block;
    position: relative;
  }
  .layer {
    width: 70px;
    height: 70px;
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
    /* Устанавливаем цвет рамки и фона через переменную */
    border: 2px solid var(--color); 
    border-radius: 50%;
    transition: all 0.3s;
    padding: 13px;
    background: var(--color); /* Фон слоя берем из переменной */
    box-shadow:
      inset 5px 5px 5px rgba(0, 0, 0, 0.2),
      inset -5px -5px 15px rgba(255, 255, 255, 0.1),
      5px 5px 15px rgba(0, 0, 0, 0.2),
      -5px -5px 10px rgba(255, 255, 255, 0.05);
  }

  .tooltip-container:hover .layer span {
    border-radius: 10px;
    /* background: var(--color); */ /* Уже установлено */
  }

  /* Путь SVG теперь должен быть currentColor, чтобы брать цвет из fill="currentColor" */
  /* .tooltip-container:hover .svg path {
    fill: #fff; 
  } */

  /* Цвет текста под иконкой и рамки слоя */
  .layer span,
  .icon > .text { /* Обращаемся к тексту под иконкой */
    color: var(--color);
    border-color: var(--color);
  }

  .icon:hover .layer span {
    /* Тень делаем цветом из переменной */
    box-shadow: -1px 1px 3px var(--color); 
  }
  .icon > .text { /* Обращаемся к тексту под иконкой */
    position: absolute;
    left: 50%;
    bottom: -5px;
    opacity: 0;
    font-weight: 700;
    transform: translateX(-50%);
    transition:
      bottom 0.3s ease,
      opacity 0.3s ease;
    /* Цвет текста под иконкой */
    color: var(--color); 
  }
  .icon:hover > .text { /* Обращаемся к тексту под иконкой */
    bottom: -35px;
    opacity: 1;
  }

  /* ... стили для nth-child ... */
   .icon:hover .layer span:nth-child(1) {
    opacity: 0.2;
  }
  .icon:hover .layer span:nth-child(2) {
    opacity: 0.4;
    transform: translate(5px, -5px);
  }
  .icon:hover .layer span:nth-child(3) {
    opacity: 0.6;
    transform: translate(10px, -10px);
  }
  .icon:hover .layer span:nth-child(4) {
    opacity: 0.8;
    transform: translate(15px, -15px);
  }
  .icon:hover .layer span:nth-child(5) {
    opacity: 1;
    transform: translate(20px, -20px);
  }

  .svg {
    position: absolute;
    top: 10px;
    left: 10px;
    width: 50px;
    height: 50px;
    /* Устанавливаем цвет SVG через currentColor */
    color: white; /* Белый цвет иконки внутри круга */ 
  }

  .svg path {
     /* fill: var(--color); */ /* Убираем, используем fill="currentColor" в SVG */
  }
  
  /* --- Стили тултипа --- */
  .user {
    display: flex;
    gap: 10px;
    align-items: center; /* Выравниваем иконку и текст */
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
    /* Фон и цвет текста иконки в тултипе */
    background: var(--color); 
    color: white; 
  }
  .name {
    font-size: 17px;
    font-weight: 700;
    color: #ffffff; /* Белый цвет имени */
  }
  .details {
    display: flex;
    flex-direction: column;
    gap: 0;
    color: var(--color); /* Цвет лейбла платформы */
  }
   .username {
     font-size: 0.9em; /* Уменьшим лейбл */
   }
  .about {
    color: rgba(255, 255, 255, 0.7); /* Цвет детализации */
    padding-top: 5px;
    font-size: 0.85em;
  }
`;

export default StyledSocialButton; 