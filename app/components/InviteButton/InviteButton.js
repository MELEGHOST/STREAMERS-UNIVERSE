'use client';

import { useState } from 'react';
import styles from './InviteButton.module.css';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const InviteButton = ({ targetUserName }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isCopied, setIsCopied] = useState(false);

  const handleInvite = async () => {
    if (!user?.user_metadata?.provider_id) {
      console.error('Не удалось получить ID текущего пользователя для реферальной ссылки.');
      // Здесь можно показать более user-friendly ошибку
      return;
    }

    const inviteUrl = `${window.location.origin}/auth?ref=${user.user_metadata.provider_id}`;
    
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500); // Сбросить состояние через 2.5 секунды
    } catch (err) {
      console.error('Ошибка копирования в буфер обмена:', err);
      // Показать ошибку пользователю, если копирование не удалось
    }
  };

  return (
    <button
      onClick={handleInvite}
      className={`${styles.inviteButton} ${isCopied ? styles.copied : ''}`}
      disabled={isCopied}
    >
      {isCopied ? t('inviteButton.copied') : t('inviteButton.invite', { name: targetUserName })}
    </button>
  );
};

export default InviteButton; 