import React from 'react';
import styled from 'styled-components';

// Принимаем value (username или url) и опциональный count
const VkButton = ({ value, count, className }) => {
  if (!value) return null;

  // Формируем URL и отображаемое имя
  const isLink = /^https?:\/\//i.test(value);
  const href = isLink ? value : `https://vk.com/${value.replace('@', '')}`;
  const displayUsername = value.replace('https://vk.com/', '').replace('@', '');

  // Форматируем count (если он есть и число)
  const formatCount = (num) => {
    if (typeof num !== 'number' || isNaN(num)) return null;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M+`;
    if (num >= 1000) return `${Math.floor(num / 1000)}k+`;
    return `${num}`;
  };
  const displayCount = formatCount(count);
  const aboutText = displayCount ? `${displayCount} подписчиков` : 'Профиль/Группа'; // Текст по умолчанию

  return (
    <StyledWrapper className={className}>
      <div className="tooltip-container">
        <div className="tooltip">
          <div className="profile">
            <div className="user">
              <div className="img">VK</div>
              <div className="details">
                <div className="name">ВКонтакте</div>
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
                <svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 32 32">
                  <path d="M0.094 7.75c0-1.188 0.813-1.656 1.813-1.719l4.656 0.031c0.281 0 0.531 0.188 0.625 0.469 1.063 3.438 2.375 5.563 3.938 7.969 0.094 0.188 0.25 0.281 0.406 0.281 0.125 0 0.25-0.063 0.344-0.219l0.094-0.344 0.031-5.406c0-0.781-0.375-0.906-1.25-1.031-0.344-0.063-0.563-0.375-0.563-0.688 0-0.063 0-0.125 0.031-0.188 0.438-1.344 1.813-2.031 3.75-2.031l1.75-0.031c1.438 0 2.75 0.625 2.75 2.469v7.094c0.125 0.094 0.25 0.156 0.406 0.156 0.25 0 0.563-0.156 0.813-0.563 1.625-2.281 3.469-5 3.719-6.438 0-0.063 0.031-0.094 0.063-0.156 0.344-0.688 1.219-1.156 1.594-1.281 0.063-0.031 0.156-0.063 0.281-0.063h4.844l0.313 0.031c0.469 0 0.813 0.313 0.969 0.594 0.281 0.438 0.219 0.906 0.25 1.094v0.219c-0.469 2.844-3.719 6.031-5.094 8.094-0.188 0.25-0.281 0.469-0.281 0.688 0 0.188 0.094 0.375 0.25 0.563l4.563 5.75c0.25 0.344 0.375 0.75 0.375 1.094 0 1.031-0.969 1.625-1.906 1.719l-0.531 0.031h-4.75c-0.094 0-0.156 0.031-0.25 0.031-0.531 0-0.969-0.281-1.281-0.594-1-1.219-1.969-2.469-2.938-3.688-0.188-0.25-0.25-0.281-0.438-0.406-0.219 0.906-0.406 1.844-0.625 2.781l-0.094 0.531c-0.156 0.563-0.563 1.156-1.313 1.313l-0.438 0.031h-3.063c-5.406 0-10.25-7.688-13.656-17.281-0.094-0.25-0.156-0.594-0.156-0.906zM18.875 15.844c-0.813 0-1.719-0.469-1.719-1.344v-7.188c0-0.844-0.375-1.156-1.406-1.156l-1.781 0.063c-1 0-1.563 0.156-2.031 0.469 0.719 0.344 1.375 0.813 1.375 2.125v5.5c-0.094 1.094-1 1.813-1.875 1.813-0.594 0-1.125-0.344-1.438-0.906-1.406-2.125-2.594-4.125-3.625-7l-0.281-0.813-4.156-0.031c-0.563 0-0.5 0.031-0.5 0.313 0 0.188 0.031 0.438 0.063 0.594l0.656 1.75c3.406 8.813 7.688 14.594 11.75 14.594h3.125c0.438 0 0.406-0.531 0.5-0.844l0.594-2.75c0.125-0.281 0.219-0.531 0.438-0.75 0.25-0.25 0.531-0.344 0.813-0.344 0.594 0 1.156 0.469 1.531 0.906l2.656 3.375c0.219 0.344 0.406 0.406 0.531 0.406h5.156c0.5 0 0.938-0.156 0.938-0.469 0-0.094-0.031-0.219-0.094-0.313l-4.531-5.656c-0.375-0.469-0.531-0.938-0.531-1.406 0-0.5 0.188-1 0.5-1.438 1.313-1.969 4.125-4.781 4.781-7.094l0.094-0.406c-0.031-0.156-0.031-0.281-0.063-0.438h-4.906c-0.313 0.125-0.563 0.313-0.75 0.563l-0.188 0.594c-0.719 2-2.688 4.75-4.094 6.656-0.469 0.438-1 0.625-1.531 0.625z" />
                </svg>
              </span>
            </div>
            <div className="text">ВКонтакте</div>
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
    --color: #4a76a8; /* Синий цвет ВКонтакте */
    --border: rgba(74, 118, 168, 0.25);
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
    background: rgba(74, 118, 168, 0.1);
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

export default VkButton; 