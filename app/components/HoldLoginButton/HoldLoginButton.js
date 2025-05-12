'use client';

import React, { useState, useRef, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';

// --- Вставляем ТВОИ keyframes и стили --- 
const wobble = keyframes`
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(-2px, -10px); }
  50% { transform: translate(2px, 3px); }
  75% { transform: translate(-1px, 5px); }
`;

const blurMove = keyframes`
  0%, 100% {
    text-shadow:
      5px 5px 20px rgba(255, 255, 255, 0.8),
      10px 10px 30px rgba(255, 0, 255, 0.6);
  }
  50% {
    filter: blur(1px);
    text-shadow:
      10px 10px 25px rgba(255, 255, 255, 0.8),
      15px 15px 35px rgba(255, 0, 255, 0.6);
  }
`;

const circling = keyframes`
  0% { transform: translate(-10px, -20%) rotate(0deg); }
  100% { transform: translate(-10px, -20%) rotate(200deg); } // Твой вариант с 200deg
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

// <<< Вставляем ТВОИ СТИЛИ StyledWrapper >>>
const StyledWrapper = styled.div`
  .text {
    translate: 2% -6%;
    letter-spacing: 0.01ch;
    color: hsl(0 0% calc(60% + (var(--active) * 26%))); // <<< Из твоего кода
    z-index: 999;
    padding: 0 34px;
    font-weight: 600;
    position: relative; // <<< Добавляем position: relative для before/after
    user-select: none; // <<< Добавляем user-select: none
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
    animation: 4s ${shootingStar} ease-in-out infinite; // <<< Используем твой keyframe
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
    animation: 7s ${shootingStar} ease-in-out infinite; // <<< Используем твой keyframe
    animation-delay: 3s;
  }
  .space-button:hover .text::before,
  .space-button:hover .text::after {
    display: block;
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
    animation: 1s ${glowingStars} linear alternate infinite; // <<< Используем твой keyframe
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
    animation: 1s ${glowingStars} linear alternate infinite; // <<< Используем твой keyframe
    animation-delay: 0.8s;
  }
  .space-button {
    --cut: 0.1em;
    --active: 0; // Используем твой --active для управления
    --bg: radial-gradient(
          120% 120% at 126% 126%,
          hsl(0 calc(var(--active) * 97%) 98% / calc(var(--active) * 0.9)) 40%,
          transparent 50%
        ) calc(100px - (var(--active) * 100px)) 0 / 100% 100% no-repeat,
      radial-gradient(
          120% 120% at 120% 120%,
          hsl(0 calc(var(--active) * 97%) 70% / calc(var(--active) * 1)) 30%,
          transparent 70%
        ) calc(100px - (var(--active) * 100px)) 0 / 100% 100% no-repeat,
      hsl(0 calc(var(--active) * 100%) calc(12% - (var(--active) * 8%)));
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
      0 0 calc(var(--active) * 6em) calc(var(--active) * 3em) hsla(12, 97%, 61%, 0.3),
      0 0.05em 0 0 hsl(0, calc(var(--active) * 97%), calc((var(--active) * 50%) + 30%)) inset,
      0 -0.05em 0 0 hsl(0, calc(var(--active) * 97%), calc(var(--active) * 10%)) inset;
    transition:
      box-shadow 0.25s ease-out,
      scale 0.25s,
      background 0.25s;
    scale: calc(1 + (var(--active) * 0.1));
    transform-style: preserve-3d;
    perspective: 100vmin;
    overflow: hidden;
  }
  .space-button:active {
    scale: 1;
    // Переопределяем --bg и box-shadow для :active как в твоем коде
    --bg: radial-gradient(
          120% 120% at 126% 126%,
          hsl(245 calc(var(--active) * 97%) 98% / calc(var(--active) * 0.9)) 40%,
          transparent 50%
        ) calc(100px - (var(--active) * 100px)) 0 / 100% 100% no-repeat,
      radial-gradient(
          120% 120% at 120% 120%,
          hsl(245 calc(var(--active) * 97%) 70% / calc(var(--active) * 1)) 30%,
          transparent 70%
        ) calc(100px - (var(--active) * 100px)) 0 / 100% 100% no-repeat,
      hsl(245 calc(var(--active) * 100%) calc(12% - (var(--active) * 8%)));
    box-shadow:
      0 0 calc(var(--active) * 6em) calc(var(--active) * 3em) hsl(245 97% 61% / 0.5),
      0 0.05em 0 0 hsl(245 calc(var(--active) * 97%) calc((var(--active) * 50%) + 30%)) inset,
      0 -0.05em 0 0 hsl(245 calc(var(--active) * 97%) calc(var(--active) * 10%)) inset;
    background: var(--bg); // Применяем переопределенный --bg
  }

  // Apply wobble animation on active button
  .space-button:active .text {
    font-weight: 300;
    animation:
      ${wobble} 0.6s ease-in-out infinite,
      ${blurMove} 1.5s ease-in-out infinite;
    text-shadow:
      5px 5px 20px rgba(255, 255, 255, 0.8),
      10px 10px 30px rgba(255, 0, 255, 0.6);
  }

  .galaxy:active::before { // <<< Используем :active для запуска анимации галактики
    animation: ${circling} 2s linear infinite;
  }
  .galaxy:active::after { // <<< Используем :active для запуска анимации галактики
    animation: ${circling} 1.5s linear infinite;
  }

  .galaxy {
    position: absolute;
    width: 100%;
    aspect-ratio: 1;
    top: 50%;
    left: 50%;
    translate: -50% -50%;
    overflow: hidden;
    opacity: var(--active); // Управляем через --active
    transition: opacity 0.25s;
  }

  .backdrop {
    position: absolute;
    inset: var(--cut);
    background: var(--bg);
    border-radius: 2rem;
    transition: background 0.25s;
    z-index: -1; // <<< Добавляем z-index: -1
  }

  .galaxy-button {
    position: relative;
  }

  // --- Стили для отключенной кнопки (добавляем) ---
  .space-button:disabled {
    cursor: not-allowed;
    filter: grayscale(80%);
    opacity: 0.6;
    --active: 0; // Убедимся, что --active сброшен
    scale: 1;
    animation: none !important; // Отключаем анимации
    pointer-events: none; // Отключаем события мыши
  }
  .space-button:disabled .text,
  .space-button:disabled .galaxy {
     animation: none !important;
  }
`;

// --- Компонент HoldLoginButton С ТВОИМИ СТИЛЯМИ --- 
const HoldLoginButton = ({ holdDuration = 1500 }) => {
  const { isAuthenticated, signInWithTwitch, isLoading } = useAuth();
  const router = useRouter();

  console.log('[HoldLoginButton] RENDER', { isLoading, isAuthenticated });

  const [isHolding, setIsHolding] = useState(false);
  const startTimeRef = useRef(null);
  const actionTriggeredRef = useRef(false);

  const holdDurationMs = holdDuration;

  // --- Логика удержания и отпускания --- 
  // Убираем useCallback для простоты дебага
  const startHold = () => {
    console.log('[HoldLoginButton] startHold triggered'); // <<< ЛОГ
    if (actionTriggeredRef.current || isLoading) return;
    setIsHolding(true);
    startTimeRef.current = Date.now();
    actionTriggeredRef.current = false;
  };

  // Убираем useCallback
  const resetHoldVisuals = () => {
    console.log('[HoldLoginButton] resetHoldVisuals triggered'); // <<< ЛОГ
    setIsHolding(false);
    startTimeRef.current = null;
  };

  // Убираем useCallback
  const triggerActionOnRelease = () => {
    console.log('[HoldLoginButton] triggerActionOnRelease triggered', { isHolding, isLoading }); // <<< ЛОГ
    if (!isHolding || isLoading) {
        resetHoldVisuals();
        return;
    }

    const elapsedTime = Date.now() - (startTimeRef.current || Date.now());
    const conditionMet = elapsedTime >= holdDurationMs;
    console.log('[HoldLoginButton] Release Check:', { elapsedTime, holdDurationMs, conditionMet, actionTriggered: actionTriggeredRef.current }); // <<< ЛОГ

    if (conditionMet && !actionTriggeredRef.current) {
        actionTriggeredRef.current = true;
        console.log('[HoldLoginButton] HOLD ACTION Condition met. IsAuthenticated:', isAuthenticated); // <<< ЛОГ
        if (isAuthenticated) {
            console.log('[HoldLoginButton] --- Navigating to /menu (HOLD) ---'); // <<< ЛОГ
            router.push('/menu');
        } else {
            console.log('[HoldLoginButton] --- Calling signInWithTwitch (HOLD) ---'); // <<< ЛОГ
            signInWithTwitch();
        }
    } else {
        console.log('[HoldLoginButton] Hold released too early or action already triggered.');
    }
    resetHoldVisuals();
  };

  // Убираем useCallback
  const handleClick = () => {
    console.log('[HoldLoginButton] handleClick triggered', { isLoading, isHolding, isAuthenticated });
    if (isLoading || isHolding) return;
    if (isAuthenticated) {
      console.log('[HoldLoginButton] --- Navigating to /menu (CLICK) ---');
      router.push('/menu');
    } else {
      console.log('[HoldLoginButton] --- Calling signInWithTwitch (CLICK) ---');
      signInWithTwitch();
    }
  };

  useEffect(() => {
    actionTriggeredRef.current = false;
  }, [isAuthenticated]);

  // --- Определяем текст кнопки ---
  const buttonText = isLoading
    ? 'Загрузка...'
    : isAuthenticated
      ? 'Войти в меню'
      : 'Войти через Twitch';

  // --- Используем isHolding для управления переменной --active ---
  const activeVar = isHolding ? 1 : 0;

  return (
    <StyledWrapper>
      <div className="galaxy-button">
        <button
          className={`space-button ${isHolding ? 'holding' : ''}`} // Класс holding оставляем для возможного использования
          style={{ '--active': activeVar }} // Передаем --active
          onMouseDown={isLoading ? undefined : startHold}
          onMouseUp={isLoading ? undefined : triggerActionOnRelease}
          onMouseLeave={isLoading ? undefined : resetHoldVisuals}
          onTouchStart={isLoading ? undefined : startHold}
          onTouchEnd={isLoading ? undefined : triggerActionOnRelease}
          onTouchCancel={isLoading ? undefined : resetHoldVisuals}
          onClick={handleClick}
          aria-label={buttonText}
          disabled={isLoading}
        >
          <span className="backdrop" />
          <span className="galaxy" />
          <label className="text">
            {buttonText} {/* <<< НАШ ДИНАМИЧЕСКИЙ ТЕКСТ >>> */}
          </label>
          {/* Индикатор удержания больше не нужен, если логика на :active */}
        </button>
        {/* <div className="bodydrop" /> // Убираем, если не используется */}
      </div>
    </StyledWrapper>
  );
}

export default HoldLoginButton; 