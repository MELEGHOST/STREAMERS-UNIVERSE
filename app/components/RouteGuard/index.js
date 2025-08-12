'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

const protectedRoutes = ['/menu', '/profile', '/edit-profile', '/settings', '/followers', '/followings', '/my-reviews', '/achievements', '/admin'];

const RouteGuard = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const freshLogin = searchParams?.get('freshLogin') === 'true';

  const isProtectedRoute = protectedRoutes.some(route => {
    if (route === '/profile') {
      // Защищаем только личный профиль по адресу "/profile"
      return pathname === '/profile';
    }
    return pathname.startsWith(route);
  });

  useEffect(() => {
    // Пока идет загрузка — не дергаем редирект, особенно после свежего логина
    if (isLoading) {
      return;
    }

    // Если пользователь не аутентифицирован и пытается зайти на защищенный роут:
    // - если freshLogin=true (мы только что вернулись из OAuth-коллбэка), даем контексту догрузить сессию
    // - иначе уходим на главную
    if (!isAuthenticated && isProtectedRoute) {
      if (freshLogin) {
        return;
      }
      console.log(`[RouteGuard] Access to ${pathname} denied. Redirecting to home.`);
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, isProtectedRoute, pathname, router, freshLogin]);

  // После успешной аутентификации очищаем флаг freshLogin из URL
  useEffect(() => {
    if (freshLogin && isAuthenticated) {
      router.replace(pathname);
    }
  }, [freshLogin, isAuthenticated, router, pathname]);

  // Во время первоначальной загрузки и проверки аутентификации ничего не рендерим,
  // чтобы избежать моргания контента. Можно заменить на глобальный лоадер.
  if (isLoading && isProtectedRoute) {
    return null; // или <GlobalSpinner />
  }
  
  // Рендерим дочерние элементы, если все проверки пройдены
  return <>{children}</>;
};

export default RouteGuard; 