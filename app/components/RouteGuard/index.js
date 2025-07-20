'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';

const protectedRoutes = ['/menu', '/edit-profile', '/settings', '/followers', '/followings', '/my-reviews', '/achievements', '/admin'];

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
      console.log(`[RouteGuard] Access to ${pathname} denied. Redirecting to home.`);
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, isProtectedRoute, pathname, router]);

  // Во время первоначальной загрузки и проверки аутентификации ничего не рендерим,
  // чтобы избежать моргания контента. Можно заменить на глобальный лоадер.
  if (isLoading && isProtectedRoute) {
    return null; // или <GlobalSpinner />
  }
  
  // Рендерим дочерние элементы, если все проверки пройдены
  return <>{children}</>;
};

export default RouteGuard; 