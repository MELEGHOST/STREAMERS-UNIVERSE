'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import pageStyles from '../../../styles/page.module.css';

export default function RouteGuard({ children, requiredRole }) {
  const router = useRouter();
  const { isLoading, isAuthenticated, userRole } = useAuth();

  useEffect(() => {
    if (isLoading) return; // Ничего не делаем, пока идет загрузка

    // Если не аутентифицирован
    if (!isAuthenticated) {
      console.log('[RouteGuard] Пользователь не аутентифицирован. Перенаправление на /auth');
      const nextPath = window.location.pathname;
      router.replace(`/auth?next=${nextPath}`);
      return;
    }

    // Если требуется определенная роль, но у пользователя ее нет
    if (requiredRole && userRole !== requiredRole) {
        console.log(`[RouteGuard] Доступ запрещен. Требуется роль: ${requiredRole}, у пользователя: ${userRole}. Перенаправление на /menu`);
        router.replace('/menu');
    }

  }, [isLoading, isAuthenticated, userRole, requiredRole, router]);

  // Показываем лоадер, пока идет проверка
  if (isLoading || !isAuthenticated || (requiredRole && userRole !== requiredRole)) {
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