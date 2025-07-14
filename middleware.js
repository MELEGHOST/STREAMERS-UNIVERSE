import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createMiddlewareClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { req, res }
  );

  // Единственная задача middleware - обновлять сессию пользователя.
  // Вся логика защиты перенесена на клиент в компонент RouteGuard.
  console.log('[Middleware] Updating session...');
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('[Middleware] Error getting user:', error);
  } else {
    console.log('[Middleware] User fetched:', user);
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