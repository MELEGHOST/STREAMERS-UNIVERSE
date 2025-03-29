import { NextResponse } from 'next/server';

// Вспомогательная функция для генерации случайной строки
function generateRandomString(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  
  try {
    // Проверяем наличие crypto API
    if (typeof crypto !== 'undefined') {
      // Используем Uint32Array для более эффективной генерации случайных чисел
      const values = new Uint32Array(length);
      
      // Заполняем массив случайными значениями
      crypto.getRandomValues(values);
      
      // Преобразуем случайные значения в символы
      for (let i = 0; i < length; i++) {
        // Используем побитовое И для получения индекса в диапазоне [0, charactersLength)
        result += characters.charAt(values[i] % charactersLength);
      }
      
      return result;
    }
  } catch (error) {
    console.error('Ошибка при использовании crypto API:', error);
  }
  
  // Запасной вариант для сред, где crypto API недоступен
  // Не такой безопасный, но все же функциональный
  const secureRandom = () => {
    // Используем текущее время и Math.random для создания более случайного значения
    return (Math.random() * new Date().getTime()) % 1;
  };
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(secureRandom() * charactersLength));
  }
  
  return result;
}

export function middleware(request) {
  const url = request.nextUrl.clone();
  const { pathname } = url;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    console.log('[Middleware] Обработка:', pathname);
  }

  const response = NextResponse.next();

  // --- Безопасность и CORS --- (Оставляем без изменений, но можно рефакторить)
  // Получаем origin и проверяем разрешенные домены
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'https://streamers-universe.vercel.app',
    'https://streamers-universe.com',
    'https://streamers-universe-meleghost-meleghosts-projects.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];
  const isAllowedOrigin = origin && allowedOrigins.includes(origin);

  // Установка заголовков безопасности
  try {
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Уточненный CSP, разрешающий Vercel Analytics, если используется
    const cspValue = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.twitch.tv https://*.jtvnw.net; connect-src 'self' https://api.twitch.tv https://id.twitch.tv https://*.supabase.co https://va.vercel-scripts.com; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none';";
    response.headers.set('Content-Security-Policy', cspValue.replace(/\s{2,}/g, ' ').trim());

     // Установка CORS заголовков
     if (isAllowedOrigin) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
      response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
    } else if (origin && !isProduction) {
      console.log(`[Middleware] Origin ${origin} не разрешен`);
    }

  } catch (e) {
    console.error('[Middleware] Ошибка установки заголовков безопасности/CORS:', e);
  }

  // --- Обработка OPTIONS --- 
  if (request.method === 'OPTIONS') {
    // Для OPTIONS запросов важны только CORS заголовки
    const optionsResponse = new NextResponse(null, {
      status: 200,
    });
     // Копируем нужные заголовки CORS из response
     if (isAllowedOrigin) {
        optionsResponse.headers.set('Access-Control-Allow-Credentials', response.headers.get('Access-Control-Allow-Credentials'));
        optionsResponse.headers.set('Access-Control-Allow-Origin', response.headers.get('Access-Control-Allow-Origin'));
        optionsResponse.headers.set('Access-Control-Allow-Methods', response.headers.get('Access-Control-Allow-Methods'));
        optionsResponse.headers.set('Access-Control-Allow-Headers', response.headers.get('Access-Control-Allow-Headers'));
     }
    return optionsResponse;
  }

  // --- CSRF Token --- 
  const csrfToken = request.cookies.get('csrf_token')?.value;
  if (!csrfToken) {
    const newCsrfToken = generateRandomString(32);
    response.cookies.set('csrf_token', newCsrfToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 // 1 день
    });
    if (!isProduction) {
      console.log('[Middleware] Установлен новый CSRF-токен');
    }
  }

  // --- Логика Авторизации --- 

  // Пути, не требующие авторизации
  const publicPaths = [
    '/auth', 
    '/login', 
    '/menu', 
    '/', // Главная страница?
    // API для авторизации
    '/api/auth/callback', 
    '/api/twitch/login', 
    '/api/twitch/callback',
    '/api/twitch/token',
    '/api/db-check' // Пример публичного API
  ];

  // Проверяем, является ли путь публичным
  const isPublicPath = publicPaths.some(path => pathname === path || (path.endsWith('/*') && pathname.startsWith(path.slice(0, -2))));
  
  // Пропускаем статические файлы и внутренние ресурсы Next.js
  if (pathname.startsWith('/_next/') || 
      pathname.startsWith('/static/') || 
      pathname.includes('.') // Пропускаем файлы с расширениями (favicon.ico, images, etc.)
     ) {
    return response; // Используем response, чтобы сохранить заголовки
  }

  // Проверяем наличие токенов/данных пользователя
  const hasAccessToken = request.cookies.has('twitch_access_token');
  const hasUserCookie = request.cookies.has('twitch_user') || request.cookies.has('twitch_user_data');
  const hasAuthHeader = request.headers.has('Authorization') && request.headers.get('Authorization').startsWith('Bearer ');
  
  const isAuthenticated = hasAccessToken || hasUserCookie || hasAuthHeader;

  if (!isProduction) {
      console.log('[Middleware] Статус авторизации:', {
          pathname,
          isPublicPath,
          hasAccessToken,
          hasUserCookie,
          hasAuthHeader,
          isAuthenticated
      });
  }

  // Обработка API запросов (кроме публичных API)
  if (pathname.startsWith('/api/') && !isPublicPath) {
    // Middleware больше НЕ проверяет аутентификацию для API-маршрутов.
    // Каждый API-маршрут (например, с использованием Supabase SSR)
    // должен сам проверять аутентификацию пользователя.
    /* 
    if (!isAuthenticated) {
        console.log('[Middleware] API: Не авторизован. Отказ.');
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    */
    // Просто добавляем заголовки безопасности/CORS и пропускаем запрос дальше.
    return response; 
  }

  // Обработка защищенных страниц
  if (!isPublicPath && !isAuthenticated) {
    console.log(`[Middleware] Страница: Не авторизован (${pathname}). Редирект на /auth`);
    const loginUrl = new URL('/auth', request.url);
    loginUrl.searchParams.set('redirect', pathname); // Добавляем путь для редиректа после логина
    return NextResponse.redirect(loginUrl);
  }
  
   // Если пользователь авторизован и пытается зайти на /auth или /login, редирект на /menu
   if ((pathname === '/auth' || pathname === '/login') && isAuthenticated) {
      console.log(`[Middleware] Авторизован (${pathname}). Редирект на /menu`);
      return NextResponse.redirect(new URL('/menu', request.url));
   }

  // Для всех остальных случаев (публичные страницы или авторизованные пользователи на защищенных страницах)
  return response; // Возвращаем response с установленными заголовками
}

// Конфигурация matcher остается прежней
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 