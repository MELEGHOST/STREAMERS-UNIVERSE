import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function SimpleLogo({ size = 50 }) {
  return (
    <Link href="/" style={{ display: 'inline-block' }}>
      <Image
        src="/logo.png"
        alt="Streamers Universe Logo"
        width={size}
        height={size}
        style={{ objectFit: 'contain' }}
      />
    </Link>
  );
} 