'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import pageStyles from '../../../styles/page.module.css';

export default function RouteGuard({ children }) {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('[RouteGuard] Пользователь не аутентифицирован. Перенаправление на /auth');
      // Запоминаем, куда пользователь хотел попасть
      const nextPath = window.location.pathname;
      router.replace(`/auth?next=${nextPath}`);
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className={pageStyles.container}>
          <div className={pageStyles.loadingContainer}>
              <div className="spinner"></div>
              <p>Проверка доступа...</p>
          </div>
      </div>
    );
  }

  return <>{children}</>;
} 