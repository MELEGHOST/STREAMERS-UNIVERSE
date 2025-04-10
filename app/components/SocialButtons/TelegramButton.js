import React from 'react';
import styled from 'styled-components';

// Принимаем url как проп
const TelegramButton = ({ url }) => {
  // Используем url в href, если он есть, иначе '#'
  const targetUrl = url || '#';

  return (
    <StyledWrapper>
      <div className="tooltip-container">
        <div className="tooltip">
          <div className="profile">
            <div className="user">
              <div className="img">TG</div>
              <div className="details">
                <div className="name">Telegram</div> {/* Хардкод */}
                <div className="username">Канал/Чат</div> {/* Хардкод */}
              </div>
            </div>
            <div className="about">Подписывайся!</div> {/* Хардкод */}
          </div>
        </div>
        <div className="text">
          {/* Используем targetUrl */}
          <a href={targetUrl} target="_blank" rel="noopener noreferrer" className="icon">
            <div className="layer">
              <span />
              <span />
              <span />
              <span />
              <span className="svg">
                 {/* SVG иконка Telegram */} 
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" height={44} width={44}> {/* Уменьшил размер */} 
                  <path fill="currentColor" d="M120,0C53.7,0,0,53.7,0,120s53.7,120,120,120s120-53.7,120-120S186.3,0,120,0z M175.3,78.1l-21.2,100.1
              c-1.6,7.1-5.8,8.9-11.7,5.6l-32.4-23.9l-15.6,15.1c-1.7,1.7-3.1,3.1-6.3,3.1l2.3-32.9l59.9-54.1c2.6-2.3-0.6-3.6-4-1.3l-74,46.6
              l-31.9-10c-6.9-2.1-7-6.9,1.5-10.2l124.6-48.1C171.2,66.5,177.2,70.4,175.3,78.1z" />
                </svg>
              </span>
            </div>
            <div className="text">Telegram</div>
          </a>
        </div>
      </div>
    </StyledWrapper>
  );
}

// Стили (StyledWrapper) остаются те же, что ты предоставил, с небольшими правками
const StyledWrapper = styled.div`
  .tooltip-container {
    --color: #229ed9; /* Telegram Blue */
    --border: rgba(34, 158, 217, 0.25);
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
    box-shadow:
      inset 5px 5px 5px rgba(0, 0, 0, 0.2),
      inset -5px -5px 15px rgba(255, 255, 255, 0.1),
      5px 5px 15px rgba(0, 0, 0, 0.3),
      -5px -5px 15px rgba(255, 255, 255, 0.1);
  }

  .profile {
    background: rgba(34, 158, 217, 0.1);
    border-radius: 10px 15px;
    padding: 10px;
    border: 1px solid var(--border);
    min-width: 180px; // Чтобы тултип не был слишком узким
  }

  .tooltip-container:hover .tooltip {
    top: -125px; // Немного поднял
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
     z-index: 10; // Чтобы был поверх других элементов
  }

  .icon {
    text-decoration: none;
    color: #fff;
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
    border: 2px solid #fff;
    border-radius: 50%;
    transition: all 0.3s;
    /* padding: 13px; */ // Убрал, чтобы SVG лучше центрировался
    background: #fff;
    box-shadow:
      inset 5px 5px 5px rgba(0, 0, 0, 0.2),
      inset -5px -5px 15px rgba(255, 255, 255, 0.1),
      5px 5px 15px rgba(0, 0, 0, 0.2),
      -5px -5px 10px rgba(255, 255, 255, 0.05);
     display: flex; // Для центрирования SVG
     align-items: center;
     justify-content: center;
  }

  .tooltip-container:hover .layer span {
    border-radius: 10px;
    background: var(--color);
  }

  .tooltip-container:hover .svg path {
    fill: #fff;
  }

  .layer span,
  .text {
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
    white-space: nowrap; // Чтобы текст не переносился
  }

  .icon:hover .text {
    bottom: -35px;
    opacity: 1;
  }

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

  .svg path {
    fill: var(--color);
     transition: fill 0.3s ease; // Плавное изменение цвета иконки
  }

  /* Стили тултипа */
   .user {
    display: flex;
    gap: 10px;
    align-items: center;
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
    color: var(--color); // Цвет текста TG
    flex-shrink: 0;
  }
  .name {
    font-size: 17px;
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
     font-size: 0.9em;
     color: #ccc;
     margin: 0;
   }
  .about {
    color: rgba(255, 255, 255, 0.7);
    padding-top: 8px;
    font-size: 0.9em;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    margin-top: 8px;
  }
`;

export default TelegramButton; 