'use client';

import Image from 'next/image';
import styles from './menu.module.css';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';

export default function MenuPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const menuItems = [
    { label: t('menu.profile', { defaultValue: 'Профиль' }), icon: '/icons/profile.png', href: '/profile', color: '142, 249, 252' },
    { label: t('menu.followers', { defaultValue: 'Подписчики' }), icon: '/icons/followers.png', href: '/followers', color: '142, 252, 157' },
    { label: t('menu.followings', { defaultValue: 'Подписки' }), icon: '/icons/followings.png', href: '/followings', color: '215, 252, 142' },
    { label: t('menu.settings', { defaultValue: 'Настройки' }), icon: '/icons/settings.png', href: '/settings', color: '252, 142, 142' },
    { label: t('menu.search', { defaultValue: 'Поиск' }), icon: '/icons/search.png', href: '/search', color: '204, 142, 252' },
    { label: t('menu.createReview', { defaultValue: 'Создать отзыв' }), icon: '/icons/review.png', href: '/reviews/create', color: '142, 202, 252' },
  ];

  const HoloMenu = styled.div`
  .wrapper {
    width: 100%;
    height: 100%;
    position: relative;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .inner {
    --w: 100px;
    --h: 150px;
    --translateZ: calc((var(--w) + var(--h)) + 0px);
    --rotateX: -15deg;
    --perspective: 1000px;
    position: absolute;
    width: var(--w);
    height: var(--h);
    top: 25%;
    left: calc(50% - (var(--w) / 2) - 2.5px);
    z-index: 2;
    transform-style: preserve-3d;
    transform: perspective(var(--perspective));
    animation: rotating 20s linear infinite;
  }
  @keyframes rotating {
    from {
      transform: perspective(var(--perspective)) rotateX(var(--rotateX))
        rotateY(0);
    }
    to {
      transform: perspective(var(--perspective)) rotateX(var(--rotateX))
        rotateY(1turn);
    }
  }

  .card {
    position: absolute;
    border: 2px solid rgba(var(--color-card));
    border-radius: 12px;
    overflow: hidden;
    inset: 0;
    transform: rotateY(calc((360deg / var(--quantity)) * var(--index)))
      translateZ(var(--translateZ));
    cursor: pointer;
  }

  .img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    background: #0000
      radial-gradient(
        circle,
        rgba(var(--color-card), 0.2) 0%,
        rgba(var(--color-card), 0.6) 80%,
        rgba(var(--color-card), 0.9) 100%
      );
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: white;
    font-weight: bold;
  }
`;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>{t('menu_page.title', { defaultValue: 'Меню навигации' })}</h1>
      </header>
      <HoloMenu>
        <div className="wrapper">
          <div className="inner" style={{ '--quantity': menuItems.length }}>
            {menuItems.map((item, index) => (
              <div
                className="card"
                style={{ '--index': index, '--color-card': item.color }}
                key={index}
                onClick={() => router.push(item.href)}
              >
                <div className="img">
                  <Image src={item.icon} alt={item.label} width={60} height={60} />
                  <span>{item.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </HoloMenu>
    </div>
  );
}
