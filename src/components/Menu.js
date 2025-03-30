import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

const Menu = () => {
  const router = useRouter();

  return (
    <nav className="menu active">
      <button onClick={() => router.push('/profile')}>My Profile</button>
      <button onClick={() => router.push('/twitch')}>Twitch Tracker</button>
      <button onClick={() => router.push('/top')}>Top Streamers</button>
    </nav>
  );
};

export default Menu;
