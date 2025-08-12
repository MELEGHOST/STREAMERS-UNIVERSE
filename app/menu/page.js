'use client';

import styles from './menu.module.css';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { useState, useRef, useEffect } from 'react';
import { FaUser, FaUsers, FaUserFriends, FaCog, FaSearch, FaPen } from 'react-icons/fa';
import Logo from '../components/Logo/Logo';

export default function MenuPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [rotation, setRotation] = useState(0);
  const [isIdle, setIsIdle] = useState(true);
  const timerRef = useRef(null);
  const startX = useRef(0);
  const isDragging = useRef(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    timerRef.current = setTimeout(() => setIsIdle(true), 120000);
    return () => clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleStart = (x) => {
    setIsIdle(false);
    clearTimeout(timerRef.current);
    startX.current = x;
    isDragging.current = true;
  };

  const handleMove = (x) => {
    if (isDragging.current) {
      const deltaX = x - startX.current;
      setRotation((prev) => prev + deltaX * 0.5);
      startX.current = x;
    }
  };

  const handleEnd = () => {
    isDragging.current = false;
    timerRef.current = setTimeout(() => setIsIdle(true), 120000);
  };

  const handleTouchStart = (e) => handleStart(e.touches[0].clientX);
  const handleTouchMove = (e) => handleMove(e.touches[0].clientX);
  const handleTouchEnd = handleEnd;

  const handleMouseDown = (e) => handleStart(e.clientX);
  const handleMouseMove = (e) => {
    if (isDragging.current) handleMove(e.clientX);
  };
  const handleMouseUp = handleEnd;
  const handleMouseLeave = handleEnd;

  const menuItems = [
    { label: t('menu.profile', { defaultValue: 'Профиль' }), icon: FaUser, href: '/profile', color: '142, 249, 252' },
    { label: t('menu.followers', { defaultValue: 'Подписчики' }), icon: FaUsers, href: '/followers', color: '142, 252, 157' },
    { label: t('menu.followings', { defaultValue: 'Подписки' }), icon: FaUserFriends, href: '/followings', color: '215, 252, 142' },
    { label: t('menu.settings', { defaultValue: 'Настройки' }), icon: FaCog, href: '/settings', color: '252, 142, 142' },
    { label: t('menu.search', { defaultValue: 'Поиск' }), icon: FaSearch, href: '/search', color: '204, 142, 252' },
    { label: t('menu.createReview', { defaultValue: 'Создать отзыв' }), icon: FaPen, href: '/reviews/create', color: '142, 202, 252' },
  ];

  const HoloMenu = styled.div`
    .wrapper {
      width: 100%;
      height: 500px;
      position: relative;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: visible;
    }

    .inner {
      --w: 250px;
      --h: 350px;
      --translateZ: calc((var(--w) + var(--h)) / 2);
      --rotateX: 0deg;
      --perspective: 2000px;
      position: absolute;
      width: var(--w);
      height: var(--h);
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) perspective(var(--perspective));
      z-index: 2;
      transform-style: preserve-3d;
      animation: ${props => props.isIdle ? 'rotating 60s linear infinite' : 'none'};
    }
    @keyframes rotating {
      from {
        transform: translate(-50%, -50%) perspective(var(--perspective)) rotateX(var(--rotateX)) rotateY(0);
      }
      to {
        transform: translate(-50%, -50%) perspective(var(--perspective)) rotateX(var(--rotateX)) rotateY(1turn);
      }
    }

    .card {
      position: absolute;
      border: 2px solid rgba(var(--color-card), 0.8);
      border-radius: 20px;
      overflow: hidden;
      inset: 0;
      transform: rotateY(calc((360deg / var(--quantity)) * var(--index))) translateZ(var(--translateZ));
      cursor: pointer;
      pointer-events: auto;
      background: rgba(0, 0, 0, 1);
      backface-visibility: hidden;
      box-shadow: 0 0 20px rgba(var(--color-card), 0.5);
    }

    .img {
      width: 100%;
      height: 80%;
      object-fit: cover;
      background: #0000 radial-gradient(circle, rgba(var(--color-card), 0.2) 0%, rgba(var(--color-card), 0.6) 80%, rgba(var(--color-card), 0.9) 100%);
      display: flex;
      justify-content: center;
      align-items: center;
    }
  `;

  return (
    <div className={styles.container}>
      <div className={styles.logoContainer}>
        <Logo width={400} height={150} />
      </div>
      {isMobile ? (
        <div className={styles.mobileMenu}>
          {menuItems.map((item, index) => (
            <div
              key={index}
              className={styles.mobileCard}
              onClick={() => router.push(item.href)}
            >
              <item.icon size={50} color={`rgb(${item.color})`} />
              <h4>{item.label}</h4>
            </div>
          ))}
        </div>
      ) : (
        <HoloMenu isIdle={isIdle}>
          <div className="wrapper" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave}>
            <div className="inner" style={{ '--quantity': menuItems.length, transform: `translate(-50%, -50%) perspective(var(--perspective)) rotateY(${rotation}deg)` }}>
              {menuItems.map((item, index) => (
                <div
                  className="card"
                  style={{ '--index': index, '--color-card': item.color }}
                  key={index}
                  onClick={() => router.push(item.href)}
                >
                  <div className="img">
                    <item.icon size={100} color="white" />
                    <h4 className="label">{item.label}</h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </HoloMenu>
      )}
    </div>
  );
}
