'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import pageStyles from '../home.module.css';

export default function WelcomePage() {
  const router = useRouter();

  useEffect(() => {
    // Небольшая задержка перед редиректом, чтобы дать время
    // клиентскому AuthContext полностью синхронизироваться.
    const timer = setTimeout(() => {
      console.log('[WelcomePage] Перенаправление в /menu...');
      router.replace('/menu'); // Используем replace, чтобы нельзя было вернуться назад
    }, 500); // 500 мс должно быть достаточно

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className={pageStyles.container}>
      <div className={pageStyles.loadingContainer}>
        <div className="spinner"></div>
        <p>С возвращением! Перенаправляем в меню...</p>
      </div>
    </div>
  );
} 