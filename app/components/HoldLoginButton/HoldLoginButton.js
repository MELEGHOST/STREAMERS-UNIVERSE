'use client';

import React, { useState, useRef, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../../contexts/AuthContext';

// --- Styled Components (твой код) --- 
const wobble = keyframes`
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(-2px, -10px); }
  50% { transform: translate(2px, 3px); }
  75% { transform: translate(-1px, 5px); }
`;

const blurMove = keyframes`
  0%, 100% { text-shadow: 5px 5px 20px rgba(255, 255, 255, 0.8), 10px 10px 30px rgba(255, 0, 255, 0.6); filter: blur(0); }
  50% { text-shadow: 10px 10px 25px rgba(255, 255, 255, 0.8), 15px 15px 35px rgba(255, 0, 255, 0.6); filter: blur(1px); }
`;

const circling = keyframes`
  0% { transform: translate(-10px, -20%) rotate(0deg); }
  100% { transform: translate(-10px, -20%) rotate(360deg); } // Полный оборот
`;

const shootingStar = keyframes`
    0% { transform: translateX(0) translateY(0); opacity: 1; }
    50% { transform: translateX(-55em) translateY(0); opacity: 1; }
    70% { transform: translateX(-70em) translateY(0); opacity: 0; }
    100% { transform: translateX(0) translateY(0); opacity: 0; }
`;

const glowingStars = keyframes`
    0% { opacity: 0; }
    50% { opacity: 1; }
    100% { opacity: 0; }
`;

const StyledWrapper = styled.div`
  display: inline-block; // Чтобы кнопка занимала только свое место
  --hold-duration: 2000ms; // Время удержания в миллисекундах (2 секунды)
  --hold-progress: 0; // Переменная для прогресса удержания

  .text {
    translate: 2% -6%;
    letter-spacing: 0.01ch;
    // Меняем цвет на белый и добавляем зависимость от прогресса
    color: hsl(0 0% calc(100% - (var(--hold-progress) * 40%))); 
    z-index: 999;
    padding: 0 34px;
    font-weight: 600;
    position: relative; // Нужно для псевдоэлементов
    user-select: none; // Запрещаем выделение текста
  }
  .text::before {
    content: "";
    position: absolute;
    top: -290%;
    left: 90%;
    rotate: -45deg;
    width: 5em;
    height: 1px;
    background: linear-gradient(90deg, #ffffff, transparent);
    animation: ${shootingStar} 4s ease-in-out infinite;
    transition: 1s ease;
    z-index: -1;
    animation-delay: 1s;
    display: none;
  }
  .text::after {
    content: "";
    display: none;
    position: absolute;
    top: -290%;
    left: 10%;
    rotate: -45deg;
    width: 5em;
    height: 1px;
    background: linear-gradient(90deg, #ffffff, transparent);
    animation: ${shootingStar} 7s ease-in-out infinite;
    animation-delay: 3s;
  }
  .space-button:hover .text::before,
  .space-button:hover .text::after {
    display: block;
  }

  // Добавляем отображение прогресса удержания
  .hold-indicator {
      position: absolute;
      bottom: 5px; // Положение индикатора
      left: 10%;
      width: 80%;
      height: 4px;
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
      overflow: hidden;
      opacity: 0;
      transition: opacity 0.3s;
      z-index: 1000;
  }
  .hold-indicator::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: calc(var(--hold-progress) * 100%);
      background-color: #fff;
      border-radius: 2px;
      transition: width 0.1s linear; // Плавное заполнение
  }
  .space-button.holding .hold-indicator {
      opacity: 1;
  }


  .galaxy::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 2px;
    height: 2px;
    border-radius: 50%;
    opacity: 1;
    box-shadow:
      140px 20px #fff,
      425px 20px #fff,
      70px 120px #fff,
      20px 130px #fff,
      110px 80px #fff,
      280px 80px #fff,
      250px 350px #fff,
      280px 230px #fff,
      220px 190px #fff,
      450px 100px #fff,
      380px 80px #fff,
      520px 50px #fff;
    z-index: -1;
    transition: all 1.5s ease-in-out;
    animation: ${glowingStars} 1s linear alternate infinite;
    animation-delay: 0.4s;
  }
  .galaxy::after {
    content: "";
    position: absolute;
    top: -150px;
    left: -65px;
    width: 2px;
    height: 2px;
    border-radius: 50%;
    opacity: 1;
    box-shadow:
      490px 330px #fff,
      420px 300px #fff,
      320px 280px #fff,
      380px 350px #fff,
      546px 170px #fff,
      420px 180px #fff,
      370px 150px #fff,
      200px 250px #fff,
      80px 20px #fff,
      190px 50px #fff,
      270px 20px #fff,
      120px 230px #fff,
      350px -1px #fff,
      150px 369px #fff;
    z-index: -1;
    transition: all 2s ease-in-out;
    animation: ${glowingStars} 1s linear alternate infinite;
    animation-delay: 0.8s;
  }
  .space-button {
    --cut: 0.1em;
    --active: 0; // Будем использовать для hover/focus
    --holding-active: 0; // Отдельно для состояния удержания
    // Меняем цвета на фиолетово-розовые тона
    --bg: radial-gradient(
          120% 120% at 126% 126%,
          hsl(280 calc(var(--holding-active) * 80%) 98% / calc(var(--holding-active) * 0.7)) 40%,
          transparent 50%
        ) calc(100px - (var(--holding-active) * 100px)) 0 / 100% 100% no-repeat,
      radial-gradient(
          120% 120% at 120% 120%,
          hsl(300 calc(var(--holding-active) * 85%) 75% / calc(var(--holding-active) * 0.8)) 30%,
          transparent 70%
        ) calc(100px - (var(--holding-active) * 100px)) 0 / 100% 100% no-repeat,
      hsl(270 calc(var(--holding-active) * 50%) calc(15% - (var(--holding-active) * 10%)));
    background: var(--bg);
    font-size: 1.4rem;
    font-weight: 500;
    border: 0;
    cursor: pointer;
    padding: 0.9em 1.3em;
    display: flex;
    align-items: center;
    gap: 0.25em;
    white-space: nowrap;
    border-radius: 2rem;
    position: relative;
    box-shadow:
        0 0 calc(var(--holding-active) * 4em) calc(var(--holding-active) * 2em) hsla(300, 90%, 70%, 0.4),
        0 0.05em 0 0 hsl(280, calc(var(--holding-active) * 60%), calc((var(--holding-active) * 40%) + 40%)) inset,
        0 -0.05em 0 0 hsl(270, calc(var(--holding-active) * 50%), calc(var(--holding-active) * 5%)) inset;
    transition:
      box-shadow 0.3s ease-out,
      scale 0.3s,
      background 0.3s;
    scale: calc(1 + (var(--holding-active) * 0.05)); // Чуть меньше scale при удержании
    transform-style: preserve-3d;
    perspective: 100vmin;
    overflow: hidden;
  }

  // Отдельный стиль для hover/focus, не зависящий от удержания
  .space-button:is(:hover, :focus-visible) {
      --active: 1;
      filter: brightness(1.1);
  }
  .space-button:is(:hover, :focus-visible) .text::before,
  .space-button:is(:hover, :focus-visible) .text::after {
      display: block;
  }
  
  // Стили при активном УДЕРЖАНИИ (класс .holding)
  .space-button.holding {
    --holding-active: 1; 
    scale: 1.05; // Можно чуть увеличить при удержании
    // Анимации текста при удержании
    .text {
        animation: ${wobble} 0.8s ease-in-out infinite, ${blurMove} 1.8s ease-in-out infinite;
        text-shadow:
            3px 3px 15px rgba(255, 255, 255, 0.7),
            6px 6px 25px rgba(255, 100, 255, 0.5); 
    }
    // Анимации галактики при удержании
    .galaxy::before { animation: ${circling} 2s linear infinite; }
    .galaxy::after { animation: ${circling} 1.5s linear infinite; }
  }

  .galaxy {
    position: absolute;
    width: 100%;
    aspect-ratio: 1;
    top: 50%;
    left: 50%;
    translate: -50% -50%;
    overflow: hidden;
    opacity: var(--holding-active); // Зависит от удержания
    transition: opacity 0.3s;
  }

  .backdrop {
    position: absolute;
    inset: var(--cut);
    background: var(--bg);
    border-radius: 2rem;
    transition: background 0.3s;
    z-index: -1; // Помещаем под текст и галактику
  }

  .galaxy-button {
    position: relative;
  }
`;

// --- Компонент кнопки --- 
const HoldLoginButton = ({ holdDuration = 2000 }) => {
  const { signInWithTwitch } = useAuth();
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0); // От 0 до 1
  const holdTimeoutRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const startTimeRef = useRef(null);

  const holdDurationMs = holdDuration;

  const startHold = () => {
    setIsHolding(true);
    startTimeRef.current = Date.now();
    setHoldProgress(0);

    // Запускаем таймер на выполнение действия
    holdTimeoutRef.current = setTimeout(() => {
      console.log('Hold complete! Signing in...');
      if (signInWithTwitch) {
          signInWithTwitch();
      }
      resetHold(); 
    }, holdDurationMs);

    // Запускаем интервал для обновления прогресса
    progressIntervalRef.current = setInterval(() => {
        const elapsedTime = Date.now() - startTimeRef.current;
        const progress = Math.min(elapsedTime / holdDurationMs, 1);
        setHoldProgress(progress);
        if (progress >= 1) {
            clearInterval(progressIntervalRef.current);
        }
    }, 50); // Обновляем прогресс каждые 50мс
  };

  const resetHold = () => {
    setIsHolding(false);
    setHoldProgress(0);
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
    }
    startTimeRef.current = null;
  };

  // Очистка таймеров при размонтировании
  useEffect(() => {
    return () => {
      resetHold();
    };
  }, []);

  // Обновляем CSS переменную для прогресса
  const buttonStyle = {
      '--hold-progress': holdProgress,
      '--holding-active': isHolding ? 1 : 0 // Передаем состояние удержания в CSS
  };

  return (
    <StyledWrapper>
      <div className="galaxy-button">
        <button 
          className={`space-button ${isHolding ? 'holding' : ''}`}
          style={buttonStyle}
          onMouseDown={startHold}
          onMouseUp={resetHold}
          onMouseLeave={resetHold} // Сбрасываем, если мышь ушла с кнопки
          onTouchStart={(e) => { e.preventDefault(); startHold(); }} // PreventDefault для мобилок
          onTouchEnd={resetHold}
          onTouchCancel={resetHold} // На случай системной отмены касания
        >
          <span className="backdrop" />
          <span className="galaxy" />
          <label className="text">Войти через Twitch</label>
          <div className="hold-indicator"></div> {/* Индикатор прогресса */} 
        </button>
        {/* <div className="bodydrop" /> -> Не используется без поддержки :has */}
      </div>
    </StyledWrapper>
  );
}

export default HoldLoginButton; 