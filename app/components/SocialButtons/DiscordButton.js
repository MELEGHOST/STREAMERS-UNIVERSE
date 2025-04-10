import React from 'react';
import styled from 'styled-components';

// Принимаем url как проп
const DiscordButton = ({ url }) => {
  // Используем url в href, если он есть, иначе '#' или можно вообще не рендерить кнопку
  const targetUrl = url || '#';

  return (
    <StyledWrapper>
      <div className="tooltip-container">
        <div className="tooltip">
          <div className="profile">
            <div className="user">
              <div className="img">DI</div>
              <div className="details">
                <div className="name">Discord</div> {/* Оставляем хардкод пока */}
                <div className="username">Профиль</div> {/* Оставляем хардкод пока */}
              </div>
            </div>
            <div className="about">Присоединяйся!</div> {/* Оставляем хардкод пока */}
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
              <span className="fab fa-discord">
                {/* SVG иконка Discord */}
                <svg preserveAspectRatio="xMidYMid" xmlns="http://www.w3.org/2000/svg" viewBox="0 -3.117 28 28" height={28} width={28}>
                  <path fill="#5865F2" d="M23.719 1.815A22.8 22.8 0 0 0 17.942 0c-.249.45-.54 1.055-.74 1.536q-3.231-.486-6.402 0C10.6 1.055 10.302.45 10.051 0A22.7 22.7 0 0 0 4.27 1.82C.614 7.344-.377 12.731.119 18.042c2.425 1.811 4.775 2.911 7.085 3.63a17.6 17.6 0 0 0 1.517-2.499 15 15 0 0 1-2.389-1.163 12 12 0 0 0 .586-.463c4.607 2.155 9.613 2.155 14.165 0a14 14 0 0 0 .586.463 15 15 0 0 1-2.394 1.165c.438.877.945 1.714 1.517 2.499 2.312-.72 4.664-1.82 7.089-3.633.581-6.156-.993-11.494-4.162-16.227M9.349 14.776c-1.383 0-2.517-1.291-2.517-2.863s1.11-2.866 2.517-2.866 2.541 1.291 2.517 2.866c.002 1.572-1.11 2.863-2.517 2.863m9.302 0c-1.383 0-2.517-1.291-2.517-2.863s1.11-2.866 2.517-2.866 2.541 1.291 2.517 2.866c0 1.572-1.11 2.863-2.517 2.863" />
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

// Стили (StyledWrapper) остаются те же, что ты предоставил
const StyledWrapper = styled.div`
  .tooltip-container {
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
    background: #2a2b2f;
    border-radius: 10px 15px;
    padding: 10px;
    border: 1px solid #5865f2;
    min-width: 180px; // Чтобы тултип не был слишком узким
  }

  .tooltip-container:hover .tooltip {
    top: -125px; // Немного поднял, чтобы не перекрывать нижнюю кнопку
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
    width: 55px;
    height: 55px;
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
    border: 1px solid #fff;
    border-radius: 5px;
    transition: all 0.3s;
  }

  .layer span,
  .text {
    color: #5865f2;
    border-color: #5865f2;
  }

  .icon:hover .layer span {
    box-shadow: -1px 1px 3px #5865f2;
  }
  .icon .text {
    position: absolute;
    left: 50%;
    bottom: -5px;
    opacity: 0;
    font-weight: 500;
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

  .layer span.fab {
    /* font-size: 30px; */ // Убрали, т.к. используем SVG
    /* line-height: 64px; */ // Убрали
    display: flex; // Центрируем SVG
    align-items: center;
    justify-content: center;
    text-align: center;
    /* fill: #5865f2; */ // Управляется SVG path
    background: #000;
  }
  .user {
    display: flex;
    gap: 10px;
    align-items: center; // Центрируем по вертикали
  }
  .img {
    width: 50px;
    height: 50px;
    font-size: 25px;
    font-weight: 700;
    border: 1px solid #5865f2;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    color: #5865f2; // Цвет текста DI
    flex-shrink: 0; // Чтобы не сжимался
  }
  .name {
    font-size: 17px;
    font-weight: 700;
    color: #5865f2;
    margin: 0; // Убираем лишние отступы
  }
  .details {
    display: flex;
    flex-direction: column;
    gap: 0;
    color: #fff;
  }
   .username {
     font-size: 0.9em; // Чуть меньше
     color: #ccc; // Серый
     margin: 0;
   }
  .about {
    color: #aaa; // Светлее
    padding-top: 8px; // Немного отступ
    font-size: 0.9em;
    border-top: 1px solid rgba(255, 255, 255, 0.1); // Разделитель
    margin-top: 8px;
  }
`;

export default DiscordButton; 