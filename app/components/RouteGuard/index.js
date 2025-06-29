'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

const publicRoutes = ['/']; // Главная страница доступна всем
const protectedRoutes = ['/menu', '/profile', '/edit-profile', '/settings', '/followers', '/followings', '/my-reviews', '/achievements', '/admin'];

const RouteGuard = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  useEffect(() => {
    // Не делать ничего, пока идет первоначальная загрузка контекста
    if (isLoading) {
      return;
    }

    // Если пользователь НЕ аутентифицирован и пытается зайти на защищенный роут
    if (!isAuthenticated && isProtectedRoute) {
      console.log(`[RouteGuard] Доступ к ${pathname} запрещен. Редирект на главную.`);
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, pathname, isProtectedRoute, router]);

  // Во время загрузки показывать спиннер ТОЛЬКО на защищенных страницах
  if (isLoading && isProtectedRoute) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner"></div>
        <p>Проверка доступа...</p>
      </div>
    );
  }

  // Если загрузка завершена и пользователь не авторизован, но находится на защищенном роуте,
  // то он будет перенаправлен эффектом выше. Чтобы избежать моргания контента,
  // можно вернуть null или лоадер.
  if (!isLoading && !isAuthenticated && isProtectedRoute) {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <div className="spinner"></div>
            <p>Перенаправление...</p>
        </div>
    );
  }

  return children;
};

export default RouteGuard; 