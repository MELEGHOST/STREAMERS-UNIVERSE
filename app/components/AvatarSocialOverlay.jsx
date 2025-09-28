'use client';

import React, { useEffect } from 'react';
import SmartCutoutImage from './SmartCutoutImage.jsx';
import styles from './AvatarSocialOverlay.module.css';

// Supported platforms (14 total)
export const SUPPORTED_PLATFORMS = [
  'twitch',
  'youtube',
  'telegram',
  'discord',
  'vk',
  'tiktok',
  'yandex_music',
  'boosty',
  'instagram',
  'x',
  'kick',
  'facebook',
  'reddit',
  'steam',
];

const platformMeta = {
  twitch: {
    label: 'TW',
    color: '#9146ff',
    base: (v) => `https://twitch.tv/${v}`,
  },
  youtube: {
    label: 'YT',
    color: '#ff0000',
    base: (v) => `https://youtube.com/${v}`,
  },
  telegram: { label: 'TG', color: '#229ed9', base: (v) => `https://t.me/${v}` },
  discord: { label: 'DS', color: '#5865F2', base: () => null },
  vk: { label: 'VK', color: '#4a76a8', base: (v) => `https://vk.com/${v}` },
  tiktok: {
    label: 'TT',
    color: '#000000',
    base: (v) => `https://www.tiktok.com/@${v}`,
  },
  yandex_music: { label: 'YAM', color: '#ffcc00', base: () => null },
  boosty: {
    label: 'BO',
    color: '#ff6a00',
    base: (v) => `https://boosty.to/${v}`,
  },
  instagram: {
    label: 'inst',
    color: '#E4405F',
    base: (v) => `https://instagram.com/${v}`,
  },
  x: { label: 'X', color: '#000000', base: (v) => `https://x.com/${v}` },
  kick: {
    label: 'kick',
    color: '#53FC18',
    base: (v) => `https://kick.com/${v}`,
  },
  facebook: {
    label: 'face',
    color: '#1877f2',
    base: (v) => `https://facebook.com/${v}`,
  },
  reddit: {
    label: 'radd',
    color: '#FF4500',
    base: (v) => `https://reddit.com/u/${v}`,
  },
  steam: {
    label: 'STEM',
    color: '#171a21',
    base: (v) => `https://steamcommunity.com/id/${v}`,
  },
};

function normalizeLink(platform, value) {
  if (!value) return null;
  const isUrl = /^https?:\/\//i.test(value);
  if (isUrl) return value;
  const meta = platformMeta[platform];
  if (!meta || !meta.base) return value;
  const username = String(value).replace(/^@/, '').trim();
  return meta.base(username);
}

export default function AvatarSocialOverlay({
  avatarUrl,
  displayName,
  socialLinks,
  onClose,
}) {
  // Close on ESC
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const entries = SUPPORTED_PLATFORMS.map((p) => [p, socialLinks?.[p]]).filter(
    ([, value]) => !!value
  );

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.backdrop} onClick={onClose} />

      <button
        className={styles.closeBtn}
        aria-label="Закрыть"
        onClick={onClose}
      >
        ✕
      </button>

      <div className={styles.center}>
        <div className={styles.avatarWrapper}>
          <SmartCutoutImage
            src={avatarUrl || '/images/default_avatar.png'}
            alt={displayName || 'avatar'}
            width={300}
            height={300}
            className={styles.avatar}
          />
        </div>

        <div className={styles.ring} style={{ ['--count']: entries.length }}>
          {entries.map(([platform, value], index) => {
            const meta = platformMeta[platform] || {
              label: platform,
              color: '#888',
            };
            const href = normalizeLink(platform, value);
            return (
              <a
                key={platform}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.ringItem}
                style={{ ['--i']: index, ['--color']: meta.color }}
                aria-label={platform}
              >
                <span className={styles.badge}>{meta.label}</span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
