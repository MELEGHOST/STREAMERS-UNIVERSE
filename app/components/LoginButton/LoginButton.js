'use client';

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../../contexts/AuthContext';
import Link from 'next/link';

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
    color: hsl(0 0% 60%);
    z-index: 999;
    padding: 0 34px;
    font-weight: 600;
    position: relative;
    user-select: none;
    transition: color 0.25s;
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
    animation: 4s ${shootingStar} ease-in-out infinite;
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
    animation: 7s ${shootingStar} ease-in-out infinite;
    animation-delay: 3s;
  }
  .space-button:hover .text::before,
  .space-button:hover .text::after {
    display: block;
  }

  .space-button:hover .text {
    color: hsl(0 0% 86%); 
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
    animation: 1s ${glowingStars} linear alternate infinite; 
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
    animation: 1s ${glowingStars} linear alternate infinite; 
    animation-delay: 0.8s;
  }
  .space-button {
    --cut: 0.1em;
    --bg-default: hsl(0 0% 12%); 
    --bg-hover: hsl(0 0% 18%); 
    --bg-active: hsl(245 100% 30%); 

    background: var(--bg-default);

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
      0 0 0em 0em hsla(12, 97%, 61%, 0.3), 
      0 0.05em 0 0 hsl(0, 0%, 30%) inset,
      0 -0.05em 0 0 hsl(0, 0%, 10%) inset;
    transition:
      box-shadow 0.25s ease-out,
      scale 0.25s,
      background 0.35s ease-out; 
    scale: 1; 
    transform-style: preserve-3d;
    perspective: 100vmin;
    overflow: hidden;
  }

  .space-button:hover {
    scale: 1.05; 
    background: var(--bg-hover); 
    box-shadow: 
      0 0 3em 1.5em hsla(12, 97%, 61%, 0.2),
      0 0.05em 0 0 hsl(0, 0%, 40%) inset,
      0 -0.05em 0 0 hsl(0, 0%, 15%) inset;
  }

  .space-button:hover .galaxy {
    opacity: 0.7; 
  }
  
  .space-button:active {
    scale: 1; 
    background: radial-gradient( 
          120% 120% at 126% 126%,
          hsl(245 97% 98% / 0.9) 40%,
          transparent 50%
        ) 0px 0 / 100% 100% no-repeat,
      radial-gradient(
          120% 120% at 120% 120%,
          hsl(245 97% 70% / 1) 30%,
          transparent 70%
        ) 0px 0 / 100% 100% no-repeat,
      var(--bg-active);
    box-shadow: 
      0 0 6em 3em hsl(245 97% 61% / 0.5),
      0 0.05em 0 0 hsl(245 97% 80%) inset,
      0 -0.05em 0 0 hsl(245 97% 20%) inset;
  }

  .space-button:active .text {
    font-weight: 300;
    animation:
      ${wobble} 0.6s ease-in-out infinite,
      ${blurMove} 1.5s ease-in-out infinite;
    text-shadow:
      5px 5px 20px rgba(255, 255, 255, 0.8),
      10px 10px 30px rgba(255, 0, 255, 0.6);
    color: hsl(0 0% 90%); 
  }

  .space-button:active .galaxy { 
    opacity: 1;
  }

  .space-button:active .galaxy::before { 
    animation: ${circling} 2s linear infinite, ${glowingStars} 1s linear alternate infinite 0.4s;
  }
  .space-button:active .galaxy::after {
    animation: ${circling} 1.5s linear infinite, ${glowingStars} 1s linear alternate infinite 0.8s;
  }

  .galaxy {
    position: absolute;
    width: 100%;
    aspect-ratio: 1;
    top: 50%;
    left: 50%;
    translate: -50% -50%;
    overflow: hidden;
    opacity: 0; 
    transition: opacity 0.35s ease-out; 
  }

  .backdrop {
    position: absolute;
    inset: var(--cut);
    background: var(--bg-default); 
    border-radius: 2rem;
    transition: background 0.25s;
    z-index: -1; 
  }

  .galaxy-button {
    position: relative;
  }

  .space-button:disabled {
    cursor: not-allowed;
    filter: grayscale(80%);
    opacity: 0.6;
    scale: 1;
    animation: none !important; 
    pointer-events: none; 
  }
  .space-button:disabled .text,
  .space-button:disabled .galaxy {
     animation: none !important;
  }
`;

// Переименовываем компонент
const LoginButton = () => {
  const { signInWithTwitch, isAuthenticated, isLoading } = useAuth();
  
  // Кнопка не должна ничего делать, пока контекст не загружен.
  if (isLoading) {
    return (
      <StyledWrapper>
          <button className="space-button" disabled>
              <span className="text">Загрузка...</span>
          </button>
      </StyledWrapper>
    );
  }

  // Если пользователь аутентифицирован, показываем ССЫЛКУ, стилизованную под кнопку
  if (isAuthenticated) {
    return (
      <StyledWrapper>
          <Link href="/menu" passHref legacyBehavior>
            <a className="space-button">
                <span className="galaxy"></span>
                <span className="text">Войти в меню</span>
            </a>
          </Link>
      </StyledWrapper>
    );
  }

  // Если пользователь НЕ аутентифицирован, показываем кнопку для входа
  return (
    <StyledWrapper>
        <button onClick={() => signInWithTwitch()} className="space-button">
            <span className="galaxy"></span>
            <span className="text">Войти через Twitch</span>
        </button>
    </StyledWrapper>
  );
};

export default LoginButton; 