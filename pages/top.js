import React from 'react';
import { useAuth } from '../src/context/AuthContext';
import { useRouter } from 'next/router';
import Menu from '../src/components/Menu';
import Stars from '../src/components/Stars';

const Top = () => {
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
      <div className="frame top active">
        <h2>Топ Стримеров</h2>
        <p>Топ стримеров обновляется...</p>
      </div>
      <Stars />
    </div>
  );
};

export default Top;
