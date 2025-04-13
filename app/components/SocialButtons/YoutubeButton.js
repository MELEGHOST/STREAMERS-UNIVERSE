import React from 'react';
import styled from 'styled-components';

// Принимаем value (url канала/видео) и опциональный count
const YoutubeButton = ({ value, count, className }) => {
  if (!value) return null;

  // Формируем URL (просто используем value, т.к. это всегда ссылка)
  const href = value.startsWith('http') ? value : `https://${value}`;
  
  // Пытаемся извлечь имя канала или ID из URL (упрощенно)
  let displayUsername = 'Канал';
  try {
      const urlObj = new URL(href);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts[0] === 'channel' && pathParts[1]) {
          displayUsername = pathParts[1];
      } else if (pathParts[0] === 'c' && pathParts[1]) {
          displayUsername = pathParts[1];
      } else if (pathParts[0] === 'user' && pathParts[1]) {
           displayUsername = pathParts[1];
      } else if (urlObj.hostname.includes('youtu.be')) {
          displayUsername = 'Видео'; // Короткая ссылка
      } else if (urlObj.searchParams.get('v')) {
           displayUsername = 'Видео'; // Ссылка на видео
      }
  } catch { /* Оставляем 'Канал' */ }


  // Форматируем count
  const formatCount = (num) => {
    if (typeof num !== 'number' || isNaN(num)) return null;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M+`;
    if (num >= 1000) return `${Math.floor(num / 1000)}k+`;
    return `${num}`;
  };
  const displayCount = formatCount(count);
  const aboutText = displayCount ? `${displayCount} подписчиков` : 'Канал YouTube'; // Текст по умолчанию

  return (
    <StyledWrapper className={className}>
      <div className="tooltip-container">
        <div className="tooltip">
          <div className="profile">
            <div className="user">
              <div className="img">YT</div>
              <div className="details">
                <div className="name">YouTube</div>
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
                <svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 -7 48 48">
                  <g strokeWidth={0} id="SVGRepo_bgCarrier" />
                  <g strokeLinejoin="round" strokeLinecap="round" id="SVGRepo_tracerCarrier" />
                  <g id="SVGRepo_iconCarrier">
                    <title>Youtube-color</title>
                    <desc>Created with Sketch.</desc>
                    <defs />
                    <g fillRule="evenodd" fill="none" strokeWidth={1} stroke="none" id="Icons">
                      <g transform="translate(-200.000000, -368.000000)" id="Color-">
                        <path id="Youtube" d="M219.044,391.269916 L219.0425,377.687742 L232.0115,384.502244 L219.044,391.269916 Z M247.52,375.334163 C247.52,375.334163 247.0505,372.003199 245.612,370.536366 C243.7865,368.610299 241.7405,368.601235 240.803,368.489448 C234.086,368 224.0105,368 224.0105,368 L223.9895,368 C223.9895,368 213.914,368 207.197,368.489448 C206.258,368.601235 204.2135,368.610299 202.3865,370.536366 C200.948,372.003199 200.48,375.334163 200.48,375.334163 C200.48,375.334163 200,379.246723 200,383.157773 L200,386.82561 C200,390.73817 200.48,394.64922 200.48,394.64922 C200.48,394.64922 200.948,397.980184 202.3865,399.447016 C204.2135,401.373084 206.612,401.312658 207.68,401.513574 C211.52,401.885191 224,402 224,402 C224,402 234.086,401.984894 240.803,401.495446 C241.7405,401.382148 243.7865,401.373084 245.612,399.447016 C247.0505,397.980184 247.52,394.64922 247.52,394.64922 C247.52,394.64922 248,390.73817 248,386.82561 L248,383.157773 C248,379.246723 247.52,375.334163 247.52,375.334163 L247.52,375.334163 Z" />
                      </g>
                    </g>
                  </g>
                </svg>
              </span>
            </div>
            <div className="text">YouTube</div>
          </a>
        </div>
      </div>
    </StyledWrapper>
  );
}

// Стили из твоего кода
const StyledWrapper = styled.div`
  display: inline-block;
  vertical-align: middle;
  margin: 0 5px;

  .tooltip-container {
    --color: red;
    --border: rgba(255, 0, 0, 0.25);
    position: relative;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 17px;
    border-radius: 10px;
  }

  .tooltip {
    position: absolute;
    bottom: 100%;
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
    background: rgba(255, 0, 0, 0.1); /* Красный фон YT */
    border-radius: 10px 15px;
    padding: 10px;
    border: 1px solid var(--border);
    min-width: 180px;
    text-align: left;
  }

  .tooltip-container:hover .tooltip {
     opacity: 1;
     visibility: visible;
     pointer-events: auto;
     transform: translateX(-50%) translateY(-15px);
   }

  .icon {
    text-decoration: none;
    color: #fff;
    display: block;
    position: relative;
  }
  .layer {
    width: 50px;
    height: 50px;
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
    border: 2px solid #fff;
    border-radius: 50%;
    transition: all 0.3s;
    background: #fff;
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
    background: var(--color);
  }

  .tooltip-container:hover .svg path {
    fill: #fff;
  }

  .layer span,
  .text .text { /* Текст под иконкой */
    color: var(--color);
    border-color: var(--color);
  }

  .icon:hover .layer span {
    box-shadow: -1px 1px 3px var(--color);
  }
  .icon .text { /* Текст под иконкой */
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
  .icon:hover .text {
    bottom: -30px;
    opacity: 1;
  }

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

  .svg path {
    fill: var(--color);
    transition: fill 0.3s ease;
  }
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

export default YoutubeButton; 