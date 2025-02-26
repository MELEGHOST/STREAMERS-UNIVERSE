import React from 'react';
import { useAuth } from '../src/context/AuthContext';
import { useRouter } from 'next/router';
import Menu from '../src/components/Menu';
import Stars from '../src/components/Stars';

const Twitch = () => {
  const { currentUser } = useAuth();
  const router = useRouter();

  if (typeof window !== 'undefined' && !currentUser) {
    router.push('/auth');
    return null;
  }

  return (
    <div className="container">
      <div className="logo-container">
        <img src="/logo.png" alt="Streamers Universe Logo" className="logo" />
      </div>
      <Menu />
      <div className="frame twitch active">
        <h2>Twitch Трекер</h2>
        <p>Twitch трекер в разработке...</p>
      </div>
      <Stars />
    </div>
  );
};

export default Twitch;
