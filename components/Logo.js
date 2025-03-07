"use client";

import { useRouter } from 'next/router';
import Image from 'next/image';

export default function Logo({ size = 50, clickable = true }) {
  const router = useRouter();

  const handleClick = () => {
    if (clickable) {
      router.push('/');
    }
  };

  return (
    <div 
      style={{ 
        cursor: clickable ? 'pointer' : 'default',
        display: 'inline-block'
      }}
      onClick={handleClick}
    >
      <Image
        src="/logo.png"
        alt="Streamers Universe Logo"
        width={size}
        height={size}
        priority
      />
    </div>
  );
} 