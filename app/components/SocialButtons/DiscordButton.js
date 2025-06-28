'use client';

import React from 'react';
import styled from 'styled-components';

// Принимаем value (username#tag, ссылка)
const DiscordButton = ({ value, className }) => {
  if (!value) return null;

  // Логика для определения типа и формирования ссылки
  const isInviteLink = value.includes('discord.gg/') || value.includes('discord.com/invite/');
  const isProfileLink = value.includes('discord.com/users/');
  const isProbablyUsername = /.+#[0-9]{4}$/.test(value) || !value.includes('.'); // Простой тест на юзернейм

  let href = '#';
  let displayValue = value;
  let aboutText = 'Профиль/Сервер'; // Текст по умолчанию

  if (isInviteLink) {
    href = value.startsWith('http') ? value : `https://${value}`;
    displayValue = value.split('/').pop();
    aboutText = 'Приглашение на сервер';
  } else if (isProfileLink) {
    href = value.startsWith('http') ? value : `https://${value}`;
    displayValue = 'Профиль пользователя';
  } else if (isProbablyUsername) {
    href = '#copy';
    displayValue = value;
  } else {
     href = value.startsWith('http') ? value : `https://${value}`;
     displayValue = 'Неизвестная ссылка';
  }

  const handleClick = async (e) => {
    if (href === '#copy') {
      e.preventDefault();
      try {
        await navigator.clipboard.writeText(value);
        alert(`Discord ID "${value}" скопирован в буфер обмена!`);
      } catch (err) {
        console.error('Ошибка копирования Discord ID:', err);
        alert('Не удалось скопировать ID. Ошибка в консоли.');
      }
    }
  };

  return (
    <StyledWrapper className={className}>
      <div className="tooltip-container">
        <div className="tooltip">
          <div className="profile">
            <div className="user">
              <div className="img">DS</div>
              <div className="details">
                <div className="name">Discord</div>
                <div className="username">{displayValue}</div>
              </div>
            </div>
            <div className="about">{aboutText}</div>
          </div>
        </div>
        <div className="text">
          <a href={href} target={href === '#copy' ? '_self' : '_blank'} rel="noopener noreferrer" className="icon" onClick={handleClick}>
            <div className="layer">
              <span />
              <span />
              <span />
              <span />
              <span className="svg">
                 <svg preserveAspectRatio="xMidYMid" xmlns="http://www.w3.org/2000/svg" viewBox="0 -3.117 28 28">
                   <path fill="currentColor" d="M23.719 1.815A22.8 22.8 0 0 0 17.942 0c-.249.45-.54 1.055-.74 1.536q-3.231-.486-6.402 0C10.6 1.055 10.302.45 10.051 0A22.7 22.7 0 0 0 4.27 1.82C.614 7.344-.377 12.731.119 18.042c2.425 1.811 4.775 2.911 7.085 3.63a17.6 17.6 0 0 0 1.517-2.499 15 15 0 0 1-2.389-1.163 12 12 0 0 0 .586-.463c4.607 2.155 9.613 2.155 14.165 0a14 14 0 0 0 .586.463 15 15 0 0 1-2.394 1.165c.438.877.945 1.714 1.517 2.499 2.312-.72 4.664-1.82 7.089-3.633.581-6.156-.993-11.494-4.162-16.227M9.349 14.776c-1.383 0-2.517-1.291-2.517-2.863s1.11-2.866 2.517-2.866 2.541 1.291 2.517 2.866c.002 1.572-1.11 2.863-2.517 2.863m9.302 0c-1.383 0-2.517-1.291-2.517-2.863s1.11-2.866 2.517-2.866 2.541 1.291 2.517 2.866c0 1.572-1.11 2.863-2.517 2.863" />
                 </svg>
              </span>
            </div>
            <div className="text">Discord</div>
          </a>
        </div>
      </div>
    </StyledWrapper>
  );
}

// Стили копируем из твоего кода Discord
const StyledWrapper = styled.div`
  display: inline-block;
  vertical-align: middle;
  margin: 0 5px;

  .tooltip-container {
    --color: #5865f2; /* Discord Blue */
    --border: rgba(88, 101, 242, 0.25);
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
    background: rgba(88, 101, 242, 0.1); /* Discord фон */
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

export default DiscordButton; 