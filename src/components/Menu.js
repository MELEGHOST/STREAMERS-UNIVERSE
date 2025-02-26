import React from 'react';
import { useNavigate } from 'next/router';
import { useAuth } from '../context/AuthContext';

const Menu = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <nav className="menu">
      <button onClick={() => navigate('/profile')}>Мой профиль</button>
      <button onClick={() => navigate('/twitch')}>Twitch Трекер</button>
      <button onClick={() => navigate('/top')}>Топ Стримеров</button>
      <button onClick={handleLogout}>Выйти</button>
    </nav>
  );
};

export default Menu;
