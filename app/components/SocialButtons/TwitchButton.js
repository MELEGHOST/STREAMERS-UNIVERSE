'use client';

import React from 'react';
import styled from 'styled-components';

// Принимаем value (username) и count (реальные фолловеры)
const TwitchButton = ({ value, count, className }) => {
  if (!value) return null;

  // Формируем URL и отображаемое имя
  const href = `https://twitch.tv/${value.replace('@', '')}`;
  const displayUsername = value.replace('@', '');

  // Форматируем count
  const formatCount = (num) => {
    if (typeof num !== 'number' || isNaN(num)) return null;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M+`;
    if (num >= 1000) return `${Math.floor(num / 1000)}k+`;
    return `${num}`;
  };
  const displayCount = formatCount(count);
  // Здесь count должен быть реальным, поэтому текст другой
  const aboutText = displayCount ? `${displayCount} фолловеров` : 'Канал на Twitch'; 

  return (
    <StyledWrapper className={className}>
      <div className="tooltip-container">
        <div className="tooltip">
          <div className="profile">
            <div className="user">
              <div className="img">Tw</div>
              <div className="details">
                <div className="name">Twitch</div>
                <div className="username">@{displayUsername}</div>
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
                <svg fill="currentColor" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                  <path d="M80 0L32 96v352h128v64h64l64-64h96l128-128V0H80zm384 288l-64 64h-96l-64 64v-64H128V64h336v224zm-72-160h-32v96h32V128zm-80 0h-32v96h32V128z" />
                </svg>
              </span>
            </div>
            <div className="text">Twitch</div>
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
    --color: #9146ff; /* Фиолетовый Twitch */
    --border: rgba(145, 70, 255, 0.25);
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
    background: rgba(145, 70, 255, 0.1); /* Фиолетовый фон */
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
  .text .text {
    color: var(--color);
    border-color: var(--color);
  }

  .icon:hover .layer span {
    box-shadow: -1px 1px 3px var(--color);
  }

  .icon .text {
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

export default TwitchButton; 