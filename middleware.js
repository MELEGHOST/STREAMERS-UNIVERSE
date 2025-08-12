import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
      cookieOptions: {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
      },
    }
  );

  // Единственная задача middleware - обновлять сессию пользователя.
  // Вся логика защиты перенесена на клиент в компонент RouteGuard.
  // Меньше шума в проде
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Middleware] Updating session...');
  }
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    if (process.env.NODE_ENV !== 'production' && error.name !== 'AuthSessionMissingError') {
      console.error('[Middleware] Error getting user:', error);
    }
  } else {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Middleware] User fetched:', user);
    }
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
    '/((?!_next/static|_next/image|favicon.ico|images|auth/callback).*)',
  ],
}; 