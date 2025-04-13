import React from 'react';
import styled from 'styled-components';
import { FaTiktok } from "react-icons/fa";

const TiktokButton = ({ value, count, className }) => {
  if (!value) return null;

  const href = value.startsWith('http') ? value : `https://tiktok.com/@${value.replace('@', '')}`;
  const displayUsername = value.replace('https://tiktok.com/', '').replace('@', '');

  const formatCount = (num) => {
    if (typeof num !== 'number' || isNaN(num)) return null;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M+`;
    if (num >= 1000) return `${Math.floor(num / 1000)}k+`;
    return `${num}`;
  };
  const displayCount = formatCount(count);
  const aboutText = displayCount ? `${displayCount} подписчиков` : 'Профиль TikTok';

  return (
    <StyledWrapper className={className}>
      <div className="tooltip-container">
        <div className="tooltip">
          <div className="profile">
            <div className="user">
              <div className="img">TT</div>
              <div className="details">
                <div className="name">TikTok</div>
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
                 <FaTiktok /> 
              </span>
            </div>
            <div className="text">TikTok</div>
          </a>
        </div>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  display: inline-block;
  vertical-align: middle;
  margin: 0 5px;

  .tooltip-container {
    /* Используем градиент для цвета */
    --color-1: #ff0050; /* Розовый */
    --color-2: #00f2ea; /* Бирюзовый */
    --color: var(--color-1); /* Основной цвет для текста/иконки */
    --border: rgba(0, 0, 0, 0.25); /* Черная рамка для контраста */
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
    /* Градиентный фон */
    background: linear-gradient(45deg, rgba(255, 0, 80, 0.1), rgba(0, 242, 234, 0.1));
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
  
  /* Размер иконки TikTok */
  .layer span.svg svg {
      width: 55%; 
      height: 55%;
  }

  .tooltip-container:hover .layer span {
    border-radius: 10px;
    /* Градиентный фон при ховере */
    background: linear-gradient(45deg, var(--color-1), var(--color-2)); 
  }

  .tooltip-container:hover .svg path {
    fill: #fff;
  }

  .layer span,
  .text .text {
    color: var(--color); /* Используем основной цвет для текста */
    border-color: var(--color);
  }

  .icon:hover .layer span {
     /* Тень с градиентом сделать сложно, оставим простую */
    box-shadow: -1px 1px 3px rgba(0,0,0,0.5);
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

export default TiktokButton; 