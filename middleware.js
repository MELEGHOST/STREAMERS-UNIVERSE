import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name, options) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Обновляем сессию. Это важно для Server-Side Components и для защиты роутов.
  // getSession() вернет { session: null, user: null }, если пользователь не вошел.
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  const { pathname } = request.nextUrl;

  // --- Логика Защиты Маршрутов ---
  const protectedPaths = [
    '/menu',
    '/profile',
    '/edit-profile',
    '/settings',
    '/achievements',
    '/followers',
    '/followings',
    '/my-reviews',
    '/reviews/create',
    '/reviews/edit',
    '/admin',
  ];

  const isProtected = protectedPaths.some(path => pathname.startsWith(path));

  // Если пользователь пытается получить доступ к защищенному маршруту без сессии
  if (isProtected && !user) {
    console.log(`[Middleware] Доступ к защищенному маршруту ${pathname} запрещен. Редирект на /auth.`);
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth';
    redirectUrl.searchParams.set('next', pathname); // Запоминаем, куда шел пользователь
    return NextResponse.redirect(redirectUrl);
  }

  // Если аутентифицированный пользователь пытается зайти на /auth
  if (user && pathname === '/auth') {
    console.log('[Middleware] Авторизованный пользователь на /auth. Редирект на /menu.');
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/menu';
    redirectUrl.search = ''; // Очищаем параметры ?next=...
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Сопоставляем все пути запросов, кроме служебных:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (папка с картинками в public)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images).*)',
  ],
}; 