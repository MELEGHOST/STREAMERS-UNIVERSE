import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const protectedPaths = [
  '/profile',
  '/edit-profile',
  '/settings',
  '/my-reviews',
  '/followers',
  '/followings',
  '/achievements',
  '/admin',
];

export async function middleware(req) {
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value;
        },
        set(name, value, options) {
          req.cookies.set({ name, value, ...options });
          res.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          req.cookies.set({ name, value: '', ...options });
          res.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const { pathname } = req.nextUrl;

  // Если пользователь пытается зайти на /auth, перенаправляем его на главную
  if (pathname === '/auth') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Если пользователь не авторизован и пытается зайти на защищенную страницу
  if (!session && protectedPaths.some(path => pathname.startsWith(path))) {
    console.log(`[Middleware] Unauthorized access to ${pathname}, redirecting to home.`);
    return NextResponse.redirect(new URL('/', req.url));
  }

  return res;
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