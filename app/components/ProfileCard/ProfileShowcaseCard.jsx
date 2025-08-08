'use client';

import React from 'react';
import SmartCutoutImage from '../SmartCutoutImage.jsx';
import styles from './ProfileShowcaseCard.module.css';

function CircularStat({ label, value = 0, accent = '#ff3a00' }) {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  const bg = `conic-gradient(${accent} ${clamped * 3.6}deg, rgba(255,255,255,0.08) 0)`;
  return (
    <div className={styles.circularStat} style={{ background: bg }}>
      <div className={styles.circularInner}>
        <div className={styles.circularValue}>{clamped}%</div>
        <div className={styles.circularLabel}>{label}</div>
      </div>
    </div>
  );
}

export default function ProfileShowcaseCard({
  avatarUrl,
  displayName,
  username,
  level = 0,
  socialsPercent = 0,
  statusText,
  birthdayText,
  onAvatarClick,
}) {
  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <button className={styles.avatarButton} onClick={onAvatarClick} aria-label="Открыть соцсети">
          <SmartCutoutImage src={avatarUrl} width={280} height={280} className={styles.cutout} alt={displayName} />
        </button>
        <div className={styles.fold} />
      </div>

      <div className={styles.overlayBar}>
        <div className={styles.titleBlock}>
          <div className={styles.displayName}>{displayName}</div>
          {username && <div className={styles.username}>@{username}</div>}
        </div>
      </div>

      <div className={styles.bottom}>
        <div className={styles.statsRow}>
          <CircularStat label="Уровень" value={level} />
          <CircularStat label="Соцсети" value={socialsPercent} />
        </div>
        <div className={styles.metaRow}>
          {birthdayText && (
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>День рождения</span>
              <span className={styles.metaValue}>{birthdayText}</span>
            </div>
          )}
          {statusText && (
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Статус</span>
              <span className={styles.metaValue}>{statusText}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


