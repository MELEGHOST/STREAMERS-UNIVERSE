'use client';

import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../src/context/AuthContext';
import Stars from '../src/components/Stars';

const Home = () => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    router.push('/profile');
    return null;
  }

  return (
    <div className="frame role-selection">
      <h2>Кто вы?</h2>
      <button id="streamerBtn" onClick={() => router.push('/auth?role=streamer')}>Я стример</button>
      <button id="subscriberBtn" onClick={() => router.push('/auth?role=subscriber')}>Я подписчик</button>
      <Stars />
    </div>
  );
};

export default Home;
