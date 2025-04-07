import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request) {
  let response = NextResponse.next();
  const { pathname } = request.nextUrl;

  // --- Создание Supabase Client для Middleware --- 
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Middleware] ОШИБКА: Отсутствуют переменные окружения Supabase.');
    // Без ключей Supabase не может работать, но заголовки безопасности установим
  } 

  const supabase = supabaseUrl && supabaseAnonKey ? createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
        remove: (name, options) => response.cookies.set({ name, value: '', ...options, maxAge: 0 }),
      },
    }
  ) : null;
  // --- Конец создания Supabase Client ---

  // --- Получение пользователя Supabase --- 
  let user = null;
  if (supabase) {
      try {
        // getUser обновит сессию в куках, если нужно (передаем `response` в `setAll`)
        const { data } = await supabase.auth.getUser(); 
        user = data?.user;
        // console.log('[Middleware] User:', user ? user.id : 'null');
      } catch (e) {
         console.error('[Middleware] Ошибка при вызове getUser:', e);
      }
  } else {
      console.warn('[Middleware] Пропуск проверки Supabase из-за отсутствия ключей.');
  }
  // --- Конец получения пользователя ---

  // --- Заголовки Безопасности (упрощенные для начала) --- 
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN'); 
  // CSP пока оставим базовым, чтобы не мешал
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*; font-src 'self'; connect-src *;"); // Очень разрешающий CSP для начала
  // --- Конец заголовков ---

  // --- Логика Защиты Маршрутов --- 
  const publicPaths = [
    '/auth',                
    '/auth/callback',       
    '/',                    
  ];

  // Проверяем, является ли путь публичным (точное совпадение или начало)
  const isPublic = publicPaths.some(path => pathname === path || (path !== '/' && pathname.startsWith(path + '/')));

  // Если путь НЕ публичный И пользователь НЕ аутентифицирован
  if (!isPublic && !user) {
    console.log(`[Middleware] Доступ к ${pathname} запрещен. Редирект на /auth.`);
    const redirectUrl = new URL('/auth', request.url);
    redirectUrl.searchParams.set('message', 'Требуется вход');
    redirectUrl.searchParams.set('next', pathname); // Запоминаем, куда шел пользователь
    return NextResponse.redirect(redirectUrl);
  }

  // Если пользователь аутентифицирован и пытается зайти на /auth
  if (user && pathname === '/auth') {
    console.log('[Middleware] Авторизованный пользователь на /auth. Редирект на /menu.');
    return NextResponse.redirect(new URL('/menu', request.url));
  }

  // console.log(`[Middleware] Доступ к ${pathname} разрешен.`);
  // Возвращаем response, чтобы куки Supabase обновились
  return response; 
}

export const config = {
  matcher: [
    /*
     * Сопоставляем все пути запросов, кроме служебных:
     */
    // Исключаем api, статику, _next/image, ЛЮБОЙ favicon и папку images
    '/((?!api|_next/static|_next/image|favicon\.(ico|png)|images/).*)',
  ],
}; 