'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

const protectedRoutes = [
  '/menu',
  '/profile',
  '/edit-profile',
  '/settings',
  '/followers',
  '/followings',
  '/my-reviews',
  '/achievements',
  '/admin',
];

const RouteGuard = ({ children }) => {
  const { isAuthenticated, isLoading, refreshSession } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const freshLoginParam = searchParams?.get('freshLogin') === 'true';
  const freshLoginFlag =
    typeof window !== 'undefined' &&
    sessionStorage.getItem('freshLogin') === '1';
  const freshLogin = freshLoginParam || freshLoginFlag;

  const isAuthedRef = useRef(isAuthenticated);
  useEffect(() => {
    isAuthedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  const isProtectedRoute = protectedRoutes.some((route) => {
    if (route === '/profile') {
      // Защищаем только личный профиль по адресу "/profile"
      return pathname === '/profile';
    }
    return pathname.startsWith(route);
  });

  useEffect(() => {
    // Пока идет загрузка — не дергаем редирект
    if (isLoading) return;

    // Не защищенный роут — ничего не делаем
    if (!isProtectedRoute) return;

    // Свежий логин — даем контексту добежать
    if (freshLogin) return;

    // Уже аутентифицирован — все ок
    if (isAuthenticated) return;

    // Подстраховка от гонок: перед редиректом дёрнем refreshSession и дадим чуть времени
    let canceled = false;
    const timerId = setTimeout(async () => {
      try {
        await refreshSession();
      } catch {}
      if (!canceled && !isAuthedRef.current) {
        console.log(
          `[RouteGuard] Access to ${pathname} denied. Redirecting to home.`
        );
        router.replace('/');
      }
    }, 800);

    return () => {
      canceled = true;
      clearTimeout(timerId);
    };
  }, [
    isLoading,
    isAuthenticated,
    isProtectedRoute,
    pathname,
    router,
    freshLogin,
    refreshSession,
  ]);

  // После успешной аутентификации очищаем флаг freshLogin из URL
  useEffect(() => {
    if (freshLogin && isAuthenticated) {
      try {
        sessionStorage.removeItem('freshLogin');
      } catch {}
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
