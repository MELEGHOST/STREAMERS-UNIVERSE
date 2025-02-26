'use client';

import React, { useEffect, useState } from 'react';
import TwitchAuth from '../src/components/TwitchAuth';
import Stars from '../src/components/Stars';

const Auth = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null; // Предотвращаем рендеринг до загрузки клиента

  return (
    <div className="container">
      <TwitchAuth />
      <Stars />
    </div>
  );
};

export default Auth;
