import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

const Menu = () => {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="menu active">
      <button onClick={() => router.push('/profile')}>Мой профиль</button>
      <button onClick={() => router.push('/twitch')}>Twitch Трекер</button>
      <button onClick={() => router.push('/top')}>Топ Стримеров</button>
      <button onClick={handleLogout}>Выйти</button>
    </nav>
  );
};

export default Menu;
