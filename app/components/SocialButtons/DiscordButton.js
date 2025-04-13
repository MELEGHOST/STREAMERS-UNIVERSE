import React from 'react';
import styled from 'styled-components';

// <<< Принимаем value (может быть username#tag или ссылка) >>>
const DiscordButton = ({ value, className }) => {
  if (!value) return null;

  // <<< Логика для определения типа и формирования ссылки >>>
  const isInviteLink = value.includes('discord.gg/') || value.includes('discord.com/invite/');
  const isProfileLink = value.includes('discord.com/users/');
  const isProbablyUsername = /.+#[0-9]{4}$/.test(value) || !value.includes('.'); // Простой тест на юзернейм

  let href = '#';
  let displayValue = value;
  let actionText = 'Открыть Discord';

  if (isInviteLink) {
    href = value.startsWith('http') ? value : `https://${value}`;
    displayValue = value.split('/').pop(); // Показываем код приглашения
    actionText = 'Присоединиться к серверу';
  } else if (isProfileLink) {
    href = value.startsWith('http') ? value : `https://${value}`;
    displayValue = 'Профиль пользователя'; // Не показываем ID
    actionText = 'Открыть профиль Discord';
  } else if (isProbablyUsername) {
    // Для юзернейма копируем в буфер
    href = '#copy'; // Специальное значение для копирования
    displayValue = value;
    actionText = 'Скопировать Discord ID';
  } else {
    // Если непонятно что, просто пытаемся перейти как по ссылке
     href = value.startsWith('http') ? value : `https://${value}`;
     displayValue = 'Неизвестная ссылка';
     actionText = 'Перейти по ссылке';
  }

  const handleClick = async (e) => {
    if (href === '#copy') {
      e.preventDefault(); // Отменяем переход по ссылке #copy
      try {
        await navigator.clipboard.writeText(value);
        alert(`Discord ID "${value}" скопирован в буфер обмена!`);
      } catch (err) {
        console.error('Ошибка копирования Discord ID:', err);
        alert('Не удалось скопировать ID. Ошибка в консоли.');
      }
    }
    // Для обычных ссылок ничего не делаем, браузер перейдет сам
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
            <div className="about">{actionText}</div>
          </div>
        </div>
        <div className="text">
          {/* <<< Используем onClick для копирования >>> */}
          <a href={href} target={href === '#copy' ? '_self' : '_blank'} rel="noopener noreferrer" className="icon" onClick={handleClick}>
            <div className="layer">
              <span />
              <span />
              <span />
              <span />
              <span className="svg">
                 {/* SVG иконка Discord */}
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" height={44} width={44}> 
                    <path fill="currentColor" d="M524.531,69.836a1.5,1.5,0,0,0-1.061-.436H116.719a1.5,1.5,0,0,0-1.061.436L0,185.375V441.5a1.5,1.5,0,0,0,1.5,1.5H638.5a1.5,1.5,0,0,0,1.5-1.5V185.375ZM479.062,348.75c-26.7,0-48.25-20.425-48.25-45.575s21.55-45.575,48.25-45.575,48.25,20.425,48.25,45.575S505.762,348.75,479.062,348.75Zm-317.875,0c-26.7,0-48.25-20.425-48.25-45.575s21.55-45.575,48.25-45.575,48.25,20.425,48.25,45.575S187.887,348.75,161.187,348.75Z" />
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

const StyledWrapper = styled.div`
  .tooltip-container {
    --color: #5865f2; /* Discord Blue */
    --border: rgba(88, 101, 242, 0.25);
    position: relative;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 17px;
    border-radius: 10px;
    display: inline-block;
    vertical-align: middle;
    margin: 0 5px;
  }

  .tooltip {
    position: absolute;
    bottom: 100%; /* Позиционируем над кнопкой */
    left: 50%;
    transform: translateX(-50%) translateY(-10px); /* Смещаем вверх */
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
    z-index: 10; /* Чтобы был поверх */
    visibility: hidden; /* Скрываем изначально */
  }

  .profile {
    background: rgba(88, 101, 242, 0.1); /* Discord фон */
    border-radius: 10px 15px;
    padding: 10px;
    border: 1px solid var(--border);
    min-width: 180px;
  }

  .tooltip-container:hover .tooltip {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: translateX(-50%) translateY(-15px); /* Сдвигаем чуть выше при ховере */
  }

  .icon {
    text-decoration: none;
    color: #fff;
    display: block;
    position: relative;
  }

  .layer {
    width: 50px; /* Уменьшил размер кнопки */
    height: 50px; /* Уменьшил размер кнопки */
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
    white-space: nowrap;
  }

  .icon:hover .text {
    bottom: -30px; /* Поднял текст чуть выше */
    opacity: 1;
  }

  .icon:hover .layer span:nth-child(1) {
    opacity: 0.2;
  }
  .icon:hover .layer span:nth-child(2) {
    opacity: 0.4;
    transform: translate(3px, -3px); /* Уменьшил сдвиг */
  }
  .icon:hover .layer span:nth-child(3) {
    opacity: 0.6;
    transform: translate(6px, -6px); /* Уменьшил сдвиг */
  }
  .icon:hover .layer span:nth-child(4) {
    opacity: 0.8;
    transform: translate(9px, -9px); /* Уменьшил сдвиг */
  }
  .icon:hover .layer span:nth-child(5) {
    opacity: 1;
    transform: translate(12px, -12px); /* Уменьшил сдвиг */
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
    width: 40px; /* Уменьшил аватарку в тултипе */
    height: 40px; /* Уменьшил аватарку в тултипе */
    font-size: 20px; /* Уменьшил шрифт */
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
    font-size: 1em; /* Уменьшил */
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
     font-size: 0.8em; /* Уменьшил */
     color: #ccc;
     margin: 0;
   }
  .about {
    color: rgba(255, 255, 255, 0.7);
    padding-top: 8px;
    font-size: 0.8em; /* Уменьшил */
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    margin-top: 8px;
  }
`;

export default DiscordButton; 