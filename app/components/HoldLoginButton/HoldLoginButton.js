'use client';

import React, { useState, useRef, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';

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
  display: inline-block;
  --hold-duration: 1500ms; // <<< Уменьшил время удержания до 1.5 сек
  --hold-progress: 0; 

  .text {
    translate: 2% -6%;
    letter-spacing: 0.01ch;
    color: hsl(0 0% calc(100% - (var(--hold-progress) * 40%))); 
    z-index: 999;
    padding: 0 34px;
    font-weight: 600;
    position: relative; 
    user-select: none; 
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

  .hold-indicator {
      position: absolute;
      bottom: 5px; 
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
      transition: width 0.1s linear; 
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
    --active: 0; // Для hover/focus
    --holding-active: 0; // Для удержания
    // Возвращаем твои цвета
     --bg: radial-gradient(
          120% 120% at 126% 126%,
          hsl(0 calc(var(--holding-active) * 97%) 98% / calc(var(--holding-active) * 0.9)) 40%,
          transparent 50%
        ) calc(100px - (var(--holding-active) * 100px)) 0 / 100% 100% no-repeat,
      radial-gradient(
          120% 120% at 120% 120%,
          hsl(0 calc(var(--holding-active) * 97%) 70% / calc(var(--holding-active) * 1)) 30%,
          transparent 70%
        ) calc(100px - (var(--holding-active) * 100px)) 0 / 100% 100% no-repeat,
      hsl(0 calc(var(--holding-active) * 100%) calc(12% - (var(--holding-active) * 8%)));
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
    // Возвращаем твои тени
    box-shadow:
        0 0 calc(var(--holding-active) * 6em) calc(var(--holding-active) * 3em) hsla(12, 97%, 61%, 0.3),
        0 0.05em 0 0 hsl(0, calc(var(--holding-active) * 97%), calc((var(--holding-active) * 50%) + 30%)) inset,
        0 -0.05em 0 0 hsl(0, calc(var(--holding-active) * 97%), calc(var(--holding-active) * 10%)) inset;
    transition:
      box-shadow 0.25s ease-out,
      scale 0.25s,
      background 0.25s;
    scale: calc(1 + (var(--holding-active) * 0.1)); // Оставляем небольшой scale при удержании
    transform-style: preserve-3d;
    perspective: 100vmin;
    overflow: hidden;
  }

  .space-button:is(:hover, :focus-visible) {
      --active: 1;
      // filter: brightness(1.1); // Убираем яркость, если не нужна
  }
  .space-button:is(:hover, :focus-visible) .text::before,
  .space-button:is(:hover, :focus-visible) .text::after {
      display: block;
  }
  
  .space-button.holding {
    --holding-active: 1; 
    // scale: 1.05; // Можно вернуть scale, если хочешь
    .text {
        animation: ${wobble} 0.6s ease-in-out infinite, ${blurMove} 1.5s ease-in-out infinite;
        text-shadow:
            5px 5px 20px rgba(255, 255, 255, 0.8),
            10px 10px 30px rgba(255, 0, 255, 0.6);
    }
    .galaxy::before { animation: ${circling} 2s linear infinite; }
    .galaxy::after { animation: ${circling} 1.5s linear infinite; }
  }

  // Возвращаем :active стиль для мгновенного эффекта нажатия (если нужно)
  /* 
  .space-button:active {
    scale: 1; 
    // ... (остальные стили из твоего :active, если хочешь вернуть)
  } 
  */

  .galaxy {
    position: absolute;
    width: 100%;
    aspect-ratio: 1;
    top: 50%;
    left: 50%;
    translate: -50% -50%;
    overflow: hidden;
    opacity: var(--holding-active); 
    transition: opacity 0.25s;
  }

  .backdrop {
    position: absolute;
    inset: var(--cut);
    background: var(--bg);
    border-radius: 2rem;
    transition: background 0.25s;
    z-index: -1; 
  }

  .galaxy-button {
    position: relative;
  }
`;

// --- Компонент кнопки --- 
const HoldLoginButton = ({ holdDuration = 1000 }) => { 
  const { isAuthenticated, signInWithTwitch, isLoading } = useAuth();
  const router = useRouter();

  // --- ЛОГИ ДЛЯ ДИАГНОСТИКИ ---
  console.log('[HoldLoginButton] RENDER', { isLoading, isAuthenticated });

  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0); 
  const progressIntervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const actionTriggeredRef = useRef(false); 

  const holdDurationMs = holdDuration;

  const startHold = () => {
    if (actionTriggeredRef.current) return; 
    setIsHolding(true);
    startTimeRef.current = Date.now();
    setHoldProgress(0);
    actionTriggeredRef.current = false; 

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    progressIntervalRef.current = setInterval(() => {
        const elapsedTime = Date.now() - startTimeRef.current;
        const progress = Math.min(elapsedTime / holdDurationMs, 1);
        setHoldProgress(progress);
        
        if (progress >= 1) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null; 
        }
    }, 50); 
  };

  const triggerActionOnRelease = () => {
      console.log('[HoldButton] triggerActionOnRelease called', { isHolding }); 
      if (!isHolding) return; 
      
      if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
      }
      
      const elapsedTime = Date.now() - startTimeRef.current;
      console.log('[HoldButton] Release Check:', { 
          elapsedTime,
          holdDurationMs,
          conditionMet: elapsedTime >= holdDurationMs,
          actionTriggered: actionTriggeredRef.current
      });

      if (elapsedTime >= holdDurationMs && !actionTriggeredRef.current) {
          actionTriggeredRef.current = true; 
          console.log('[HoldButton] Hold condition met. isAuthenticated:', isAuthenticated);

          if (isAuthenticated) {
              try {
                   console.log('[HoldButton] Navigating to /menu...'); 
                   router.push('/menu');
                   resetHoldVisuals(); 
              } catch (error) {
                  console.error('[HoldButton] Error navigating to /menu:', error); 
                  resetHoldVisuals(); 
              }
          } else {
              try {
                  console.log('[HoldButton] Calling signInWithTwitch...'); 
                  if (signInWithTwitch) {
                      signInWithTwitch();
                      resetHoldVisuals(); 
                  } else {
                      console.error('[HoldButton] signInWithTwitch function not found in context!');
                      resetHoldVisuals();
                  }
              } catch (error) {
                   console.error('[HoldButton] Error calling signInWithTwitch:', error); 
                   resetHoldVisuals(); 
              }
          }
          
      } else {
          console.log('[HoldButton] Hold released too early or action already triggered.');
          resetHoldVisuals();
      }
  };

  const resetHoldVisuals = () => {
      console.log('[HoldButton] Resetting visuals...');
      setIsHolding(false);
      setHoldProgress(0);
      startTimeRef.current = null;
       if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }
  };

  useEffect(() => {
    actionTriggeredRef.current = false;
    return () => {
       if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isAuthenticated]);

  const buttonStyle = {
      '--hold-progress': holdProgress,
      '--holding-active': isHolding ? 1 : 0 
  };

  // --- Определяем текст и действие кнопки --- 
  let buttonText = 'Удерживай для входа';
  let buttonAction = null;
  let isDisabled = false;

  if (isLoading) {
    buttonText = 'Загрузка...';
    isDisabled = true;
  } else if (isAuthenticated) {
    buttonText = 'Войти в меню';
    buttonAction = () => {
        console.log('[HoldLoginButton] Клик по кнопке "Войти в меню". Переход...');
        router.push('/menu');
    };
  }

  return (
    <StyledWrapper style={{ '--hold-duration': `${holdDurationMs}ms`, '--hold-progress': holdProgress }}>
      <div className="galaxy-button">
        <button 
          className={`space-button ${isHolding ? 'holding' : ''}`}
          style={buttonStyle}
          onMouseDown={isDisabled ? undefined : startHold}
          onMouseUp={isDisabled ? undefined : triggerActionOnRelease}
          onMouseLeave={isDisabled ? undefined : resetHoldVisuals}
          onTouchStart={isDisabled ? undefined : startHold}
          onTouchEnd={isDisabled ? undefined : triggerActionOnRelease}
          onTouchCancel={isDisabled ? undefined : resetHoldVisuals}
          onClick={isDisabled ? undefined : buttonAction}
          aria-label={buttonText}
          disabled={isDisabled}
        >
          <span className="backdrop" />
          <span className="galaxy" />
          <label className="text">
            {buttonText}
          </label>
          <div className="hold-indicator"></div> 
        </button>
      </div>
    </StyledWrapper>
  );
}

export default HoldLoginButton; 