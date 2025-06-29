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
    if (!isLoading && !isAuthenticated && isProtectedRoute) {
      console.log(`[RouteGuard] User not authenticated. Redirecting from protected route: ${pathname}`);
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, isProtectedRoute, router, pathname]);

  if (isLoading && isProtectedRoute) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner"></div>
        <p>Проверка доступа...</p>
      </div>
    );
  }

  return children;
};

export default RouteGuard; 