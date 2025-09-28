'use client';

import React from 'react';
import styles from './SocialButton.module.css';

// Принимаем value (username#tag, ссылка)
const DiscordButton = ({ value, className }) => {
  if (!value) return null;

  // Логика для определения типа и формирования ссылки
  const isInviteLink =
    value.includes('discord.gg/') || value.includes('discord.com/invite/');
  const isProfileLink = value.includes('discord.com/users/');
  const isProbablyUsername = /.+#[0-9]{4}$/.test(value) || !value.includes('.');

  let href = '#';
  let displayValue = value;
  let aboutText = 'Профиль/Сервер';

  if (isInviteLink) {
    href = value.startsWith('http') ? value : `https://${value}`;
    displayValue = value.split('/').pop();
    aboutText = 'Приглашение на сервер';
  } else if (isProfileLink) {
    href = value.startsWith('http') ? value : `https://${value}`;
    displayValue = 'Профиль пользователя';
  } else if (isProbablyUsername) {
    href = '#copy';
    displayValue = value;
  } else {
    href = value.startsWith('http') ? value : `https://${value}`;
    displayValue = 'Неизвестная ссылка';
  }

  const handleClick = async (e) => {
    if (href === '#copy') {
      e.preventDefault();
      try {
        await navigator.clipboard.writeText(value);
        alert(`Discord ID "${value}" скопирован в буфер обмена!`);
      } catch (err) {
        console.error('Ошибка копирования Discord ID:', err);
        alert('Не удалось скопировать ID. Ошибка в консоли.');
      }
    }
  };

  const discordColor = '#5865f2';

  return (
    <div
      className={`${styles.wrapper} ${className || ''}`}
      style={{ '--color': discordColor }}
    >
      <div className={styles.tooltipContainer}>
        <div className={styles.tooltip}>
          <div className={styles.profile}>
            <div className={styles.user}>
              <div className={styles.img}>DS</div>
              <div className={styles.details}>
                <div className={styles.name}>Discord</div>
                <div className={styles.username}>{displayValue}</div>
              </div>
            </div>
            <div className={styles.about}>{aboutText}</div>
          </div>
        </div>
        <div className={styles.text}>
          <a
            href={href}
            target={href === '#copy' ? '_self' : '_blank'}
            rel="noopener noreferrer"
            className={styles.icon}
            onClick={handleClick}
          >
            <div className={styles.layer}>
              <span />
              <span />
              <span />
              <span />
              <span className={styles.svgContainer}>
                <svg
                  className={styles.svg}
                  preserveAspectRatio="xMidYMid"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 -3.117 28 28"
                >
                  <path
                    fill="currentColor"
                    d="M23.719 1.815A22.8 22.8 0 0 0 17.942 0c-.249.45-.54 1.055-.74 1.536q-3.231-.486-6.402 0C10.6 1.055 10.302.45 10.051 0A22.7 22.7 0 0 0 4.27 1.82C.614 7.344-.377 12.731.119 18.042c2.425 1.811 4.775 2.911 7.085 3.63a17.6 17.6 0 0 0 1.517-2.499 15 15 0 0 1-2.389-1.163 12 12 0 0 0 .586-.463c4.607 2.155 9.613 2.155 14.165 0a14 14 0 0 0 .586.463 15 15 0 0 1-2.394 1.165c.438.877.945 1.714 1.517 2.499 2.312-.72 4.664-1.82 7.089-3.633.581-6.156-.993-11.494-4.162-16.227M9.349 14.776c-1.383 0-2.517-1.291-2.517-2.863s1.11-2.866 2.517-2.866 2.541 1.291 2.517 2.866c.002 1.572-1.11 2.863-2.517 2.863m9.302 0c-1.383 0-2.517-1.291-2.517-2.863s1.11-2.866 2.517-2.866 2.541 1.291 2.517 2.866c0 1.572-1.11 2.863-2.517 2.863"
                  />
                </svg>
              </span>
            </div>
            <div className={styles.textLabel}>Discord</div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default DiscordButton;
