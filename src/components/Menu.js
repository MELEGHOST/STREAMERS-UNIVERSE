import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

const Menu = () => {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <nav className="menu active">
      <button onClick={() => router.push('/profile')}>My Profile</button>
      <button onClick={() => router.push('/twitch')}>Twitch Tracker</button>
      <button onClick={() => router.push('/top')}>Top Streamers</button>
      <button onClick={handleLogout}>Logout</button>
    </nav>
  );
};

export default Menu;
