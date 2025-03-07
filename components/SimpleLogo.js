import React from 'react';

export default function SimpleLogo({ size = 50 }) {
  return (
    <a href="/" style={{ display: 'inline-block' }}>
      <img
        src="/logo.png"
        alt="Streamers Universe Logo"
        width={size}
        height={size}
        style={{ objectFit: 'contain' }}
      />
    </a>
  );
} 