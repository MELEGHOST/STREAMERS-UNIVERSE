'use client';

import React, { useEffect, useState } from 'react';
import Profile from '../src/components/Profile';

const ProfilePage = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null; // Предотвращаем рендеринг до загрузки клиента

  return <Profile />;
};

export default ProfilePage;
