import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  // This `response` object will be modified by the `set` and `remove` functions
  // and returned at the end of the middleware.
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
          // If the cookie is set, update the request's cookies.
          request.cookies.set({
            name,
            value,
            ...options,
          });
          // Also update the response's cookies.
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name, options) {
          // If the cookie is removed, update the request's cookies.
          request.cookies.set({
            name,
            value: '',
            ...options,
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

  // Refresh session if expired - required for Server Components
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // --- Route Protection Logic ---
  const protectedPaths = [
    // '/menu', // <-- Временно убираем меню из-под серверной защиты
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

  // If user tries to access a protected route without a session
  if (isProtected && !user) {
    console.log(`[Middleware] Access to protected route ${pathname} denied. Redirecting to /auth.`);
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth';
    redirectUrl.searchParams.set('next', pathname); // Remember where the user was going
    return NextResponse.redirect(redirectUrl);
  }

  // Убираем редирект для уже аутентифицированных пользователей со страницы /auth
  // Это предотвращает гонку состояний с OAuth callback'ом.
  // Коллбэк сам отвечает за финальный редирект.
  /*
  if (user && pathname === '/auth') {
    console.log('[Middleware] Authenticated user on /auth. Redirecting to /menu.');
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/menu';
    redirectUrl.search = ''; // Clear params like ?next=...
    return NextResponse.redirect(redirectUrl);
  }
  */

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public images folder)
     *
     * We want the middleware to run on API routes to ensure
     * the session is available for server-side API logic.
     */
    '/((?!_next/static|_next/image|favicon.ico|images).*)',
  ],
}; 