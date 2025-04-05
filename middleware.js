import { NextResponse } from 'next/server';
// ДОБАВЛЕНО: Импорт Supabase SSR
import { createServerClient } from '@supabase/ssr';

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

export async function middleware(request) {
  // --- ЛОГИРОВАНИЕ ВХОДЯЩИХ КУК --- 
  // const cookieHeader = request.headers.get('Cookie') || '';
  // if (!isProduction) {
  //     try {
  //         console.log(`[Middleware] Входящие куки для ${request.nextUrl.pathname}:`, cookieHeader);
  //     } catch (e) {
  //         console.error('[Middleware] Ошибка чтения заголовка Cookie:', e);
  //     }
  // }
  // --- КОНЕЦ ЛОГИРОВАНИЯ ---
  
  const url = request.nextUrl.clone();
  const { pathname } = url;
  const isProduction = process.env.NODE_ENV === 'production';
  const response = NextResponse.next();

  // --- Настройка Supabase Client ---
  // Убираем временное отключение
  // Выносим переменные окружения для читаемости
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Проверяем наличие переменных окружения
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Middleware] КРИТИЧЕСКАЯ ОШИБКА: Не установлены переменные окружения Supabase.');
    // Можно вернуть ошибку 500, но пока просто продолжим без Supabase
    // return new NextResponse('Server Configuration Error', { status: 500 });
  }

  let supabase;
  let user = null;
  let authError = null;

  if (supabaseUrl && supabaseAnonKey) {
      supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            // Используем новые методы getAll/setAll/remove для Vercel Edge Middleware
            getAll: () => request.cookies.getAll(),
            setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
            remove: (name, options) => response.cookies.set({ name, value: '', ...options, maxAge: 0 }),
          },
        }
      );

      // --- Получаем пользователя Supabase --- 
      try {
        const { data, error } = await supabase.auth.getUser(); 
        authError = error; // Сохраняем ошибку, если есть
        user = data?.user; // Сохраняем пользователя
        
        if (error && error.message !== 'Auth session missing!' && error.message !== 'Invalid Refresh Token') {
           console.warn('[Middleware] Ошибка Supabase getUser:', error.message);
        } else if (user) {
           // console.log('[Middleware] Пользователь аутентифицирован, ID:', user.id);
        } else {
           // console.log('[Middleware] Пользователь НЕ аутентифицирован.');
        }
      } catch (e) {
         console.error('[Middleware] Непредвиденная ошибка при вызове getUser Supabase:', e);
         authError = e;
      }
  } else {
      console.warn('[Middleware] Пропуск проверки Supabase из-за отсутствия ключей.');
  }
  // --- КОНЕЦ НАСТРОЙКИ SUPABASE ---

  // Логика маршрутизации
  // console.log('[Middleware] Обработка:', pathname);

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

    // Получаем URL Supabase из переменных окружения
    const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : null;
    
    // --- ИСПРАВЛЕНИЕ CSP для Supabase --- 
    // Формируем строку для connect-src, разрешая:
    // 1. Основной URL (https://udogabnowepgxjhycddc.supabase.co)
    // 2. URL с поддоменом (https://*.udogabnowepgxjhycddc.supabase.co)
    const supabaseConnectSrc = supabaseUrl && supabaseHostname
        ? `${supabaseUrl} https://*.${supabaseHostname}`
        : 'https://*.supabase.co https://supabase.co'; // Резервный вариант, если URL не найден

    // Формируем строку для img-src (только поддомены для безопасности)
    const supabaseImgSrc = supabaseHostname 
        ? `https://*.${supabaseHostname}` 
        : 'https://*.supabase.co'; // Резервный вариант
    // --- КОНЕЦ ИСПРАВЛЕНИЯ CSP --- 

    // Формируем CSP, используя новые переменные
    const cspValue = `default-src 'self'; \
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://va.vercel-scripts.com https://vercel.live; \
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; \
font-src 'self' https://fonts.gstatic.com; \
img-src 'self' data: https://*.twitch.tv https://*.jtvnw.net ${supabaseImgSrc}; \
connect-src 'self' https://api.twitch.tv https://id.twitch.tv https://www.twitch.tv https://*.twitch.tv ${supabaseConnectSrc} https://va.vercel-scripts.com https://vercel.live; \
frame-src 'self' https://vercel.live; \
frame-ancestors 'none'; \
form-action 'self'; \
base-uri 'self'; \
object-src 'none';`;
    
    const finalCsp = cspValue.replace(/\s{2,}/g, ' ').trim();
    response.headers.set('Content-Security-Policy', finalCsp);
    // Убираем повторное логирование CSP, оставляем только для pathname
    // console.log(`[Middleware] CSP для ${pathname}:`, finalCsp);

    // Установка CORS заголовков
    if (isAllowedOrigin) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
      response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, apikey, X-Client-Info');
    } else if (origin && !isProduction) {
      // console.log(`[Middleware] Origin ${origin} не разрешен`);
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
      // console.log('[Middleware] Установлен новый CSRF-токен');
    }
  }

  // --- Логика Авторизации (ОБНОВЛЕННАЯ) ---

  const publicPaths = [
    '/auth',
    '/login', // Можно оставить на всякий случай или убрать
    '/menu',
    '/', // Главная страница
    '/auth/callback',
    '/api/db-check', // Пример публичного API
    // Добавляем пути, которые должны быть публичными, например, API для получения общих данных
    '/api/reviews/public', // Пример
  ];

  const isPublicPath = publicPaths.some(path => pathname === path || (path.endsWith('/*') && pathname.startsWith(path.slice(0, -2))));

  if (pathname.startsWith('/_next/') ||
      pathname.startsWith('/static/') ||
      pathname.includes('.')) {
    return response;
  }

  // НОВАЯ проверка аутентификации - Раскомментируем
  const isAuthenticated = !!user && !authError; // Считаем авторизованным, если есть user и нет ошибок

  if (!isProduction) {
      // console.log('[Middleware] Статус авторизации (Supabase):', {
      //     pathname,
      //     isPublicPath,
      //     isAuthenticated: isAuthenticated,
      //     userId: userId,
      //     hasAuthError: !!authError,
      //     authErrorMessage: authError?.message
      // });
  }

  // Обработка API запросов (кроме публичных API)
  if (pathname.startsWith('/api/') && !isPublicPath) {
    // Если API не публичный и пользователь не аутентифицирован, возвращаем 401
    // Исключаем callback и другие auth-связанные API, они проверят сами
    if (!isAuthenticated && !pathname.startsWith('/api/auth')) { 
        // console.warn(`[Middleware] API: Не авторизован (${pathname}). Ответ 401.`);
        // Возвращаем ошибку 401 вместо редиректа для API
        return new NextResponse(JSON.stringify({ error: 'Authentication required' }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
    // Для авторизованных запросов к API просто передаем дальше
    return response;
  }

  // Обработка защищенных страниц
  if (!isPublicPath && !isAuthenticated) {
    // console.log(`[Middleware] Страница: Не авторизован (${pathname}). Редирект на /auth`);
    const loginUrl = new URL('/auth', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    // Добавляем причину редиректа для отладки на странице /auth
    loginUrl.searchParams.set('reason', 'middleware_unauthenticated');
    return NextResponse.redirect(loginUrl);
  }
  // --- КОНЕЦ ПРОВЕРКИ АВТОРИЗАЦИИ ---

  // Если пользователь авторизован и находится на публичной или своей странице,
  // просто возвращаем response с нужными заголовками
  return response;
}

// Конфигурация Middleware: Указываем пути, на которых он должен работать
export const config = {
  matcher: [
    /*
     * Сопоставляем все пути запросов, кроме:
     * - Начинающихся с /api/auth/ (старый коллбэк, можно удалить если точно не используется)
     * - Начинающихся с /_next/static (статические файлы)
     * - Начинающихся с /static (другие статические файлы)
     * - Содержащих расширение файла (e.g. .png)
     * - favicon.ico
     */
    // '/((?!api/auth/|_next/static|static|.*\..*|favicon.ico).*)', // Старая версия
     '/((?!_next/static|static|.*\..*|favicon.ico).*)', // Упрощенная версия без api/auth
  ],
}; 