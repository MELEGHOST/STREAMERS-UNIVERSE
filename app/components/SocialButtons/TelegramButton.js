import React from 'react';
import Link from 'next/link';
import { FaTelegramPlane } from 'react-icons/fa';
import styles from './SocialButton.module.css'; // Используем общие стили для кнопок

const TelegramButton = ({ username, className }) => {
  if (!username) return null;

  // Определяем, ссылка это или юзернейм
  const isLink = username.startsWith('https://') || username.startsWith('http://');
  const href = isLink ? username : `https://t.me/${username.replace('@', '')}`;
  const displayUsername = username.replace('https://t.me/', '').replace('@', '');

  return (
    <Link 
      href={href}
      target="_blank" 
      rel="noopener noreferrer"
      className={`${styles.socialButtonBase} ${styles.telegram} ${className || ''}`}
      aria-label={`Telegram: ${displayUsername}`}
      title={`Telegram: ${displayUsername}`}
    >
      <FaTelegramPlane size={20} />
      {/* Можно добавить <span className={styles.username}>{displayUsername}</span>, если нужен текст */}
    </Link>
  );
};

export default TelegramButton; 