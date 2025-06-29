'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

const protectedRoutes = ['/menu', '/profile', '/edit-profile', '/settings', '/followers', '/followings', '/my-reviews', '/achievements', '/admin'];

const RouteGuard = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  useEffect(() => {
    // Ждем окончания загрузки данных об аутентификации
    if (isLoading) {
      return;
    }

    // Если пользователь НЕ аутентифицирован и пытается получить доступ к защищенному маршруту
    if (!isAuthenticated && isProtectedRoute) {
      console.log(`[RouteGuard] Доступ к ${pathname} запрещен. Перенаправление на главную.`);
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, isProtectedRoute, pathname, router]);

  // Во время сборки/SSR (когда window не определен), просто рендерим дочерние элементы.
  // Защита маршрутов будет работать на клиенте после гидратации.
  if (typeof window === 'undefined') {
    return <>{children}</>;
  }

  // На клиенте, во время загрузки, показываем лоадер для защищенных маршрутов
  if (isLoading && isProtectedRoute) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner"></div>
        <p>Проверка доступа...</p>
      </div>
    );
  }
  
  // Если загрузка завершена или маршрут не защищен, рендерим дочерние элементы.
  return <>{children}</>;
};

export default RouteGuard; 