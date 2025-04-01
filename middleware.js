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
  try {
    const cookieHeader = request.headers.get('cookie') || 'Нет заголовка Cookie';
    console.log(`[Middleware] Входящие куки для ${request.nextUrl.pathname}:`, cookieHeader);
  } catch (e) {
    console.error('[Middleware] Ошибка чтения заголовка Cookie:', e);
  }
  // --- КОНЕЦ ЛОГИРОВАНИЯ ---
  
  const url = request.nextUrl.clone();
  const { pathname } = url;
  const isProduction = process.env.NODE_ENV === 'production';
  const response = NextResponse.next();

  // --- Настройка Supabase Client ---
  // Выносим переменные окружения для читаемости
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Проверяем наличие переменных окружения
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Middleware] Ошибка: Не установлены переменные окружения Supabase.');
    // В случае отсутствия ключей, лучше вернуть ошибку или обработать иначе
    // return new NextResponse('Internal Server Error: Supabase keys missing', { status: 500 });
    // Пока что просто пропустим дальнейшую логику Supabase
  }

  let supabase;
  let session = null;
  let userId = null;
  let authError = null;

  if (supabaseUrl && supabaseAnonKey) {
      supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            get(name) {
              return request.cookies.get(name)?.value;
            },
            // ВОЗВРАЩАЕМ стандартные set и remove, используя response.cookies
            set(name, value, options) {
              try {
                 response.cookies.set({ name, value, ...options });
              } catch (error) {
                 console.error(`[Middleware] Ошибка установки cookie ${name}:`, error);
              }
            },
            remove(name, options) {
              try {
                 response.cookies.set({ name, value: '', ...options });
              } catch (error) {
                 console.error(`[Middleware] Ошибка удаления cookie ${name}:`, error);
              }
            },
          },
        }
      );

      // --- Получаем сессию Supabase ---
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          authError = error;
          console.error('[Middleware] Ошибка Supabase getUser:', error.message);
        } else if (data?.user) {
          session = data.user;
          userId = data.user.id;
           if (!isProduction) console.log('[Middleware] Сессия Supabase найдена, User ID:', userId);
        } else {
           if (!isProduction) console.log('[Middleware] Сессия Supabase НЕ найдена (getUser вернул null).');
        }
      } catch (e) {
         console.error('[Middleware] Непредвиденная ошибка при получении сессии Supabase:', e);
         authError = e;
      }
  } else {
       if (!isProduction) console.log('[Middleware] Пропуск проверки Supabase из-за отсутствия ключей.');
  }

  if (!isProduction) {
    console.log('[Middleware] Обработка:', pathname);
  }

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
    // Уточненный CSP, разрешающий Vercel Analytics и Supabase
    const cspValue = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.twitch.tv https://*.jtvnw.net; connect-src 'self' https://api.twitch.tv https://id.twitch.tv https://*.supabase.co https://udogabnowepgxjhycddc.supabase.co https://va.vercel-scripts.com; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none';";
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

  // НОВАЯ проверка аутентификации
  const isAuthenticated = !!session && !!userId && !authError; // Считаем авторизованным, если есть сессия и нет ошибок

  if (!isProduction) {
      console.log('[Middleware] Статус авторизации (Supabase):', {
          pathname,
          isPublicPath,
          isAuthenticated: isAuthenticated,
          userId: userId,
          hasAuthError: !!authError,
      });
  }

  // Обработка API запросов (кроме публичных API)
  if (pathname.startsWith('/api/') && !isPublicPath) {
    // Теперь API роуты *должны* сами проверять аутентификацию через createServerClient
    // Middleware просто передает запрос дальше с установленными заголовками
    return response;
  }

  // Обработка защищенных страниц
  if (!isPublicPath && !isAuthenticated) {
    console.log(`[Middleware] Страница: Не авторизован (${pathname}). Редирект на /auth`);
    const loginUrl = new URL('/auth', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    // Добавляем причину редиректа для отладки на странице /auth
    loginUrl.searchParams.set('reason', 'middleware_unauthenticated');
    return NextResponse.redirect(loginUrl);
  }

   // Если пользователь АУТЕНТИФИЦИРОВАН (по новой логике) и пытается зайти на /auth
   if (pathname === '/auth' && isAuthenticated) {
      console.log(`[Middleware] Авторизован (${pathname}). Редирект на /menu`);
      // Возможно, стоит редиректить на /profile или на запрошенный redirect?
      // Пока оставляем /menu как основную страницу для авторизованных.
      const menuUrl = new URL('/menu', request.url);
      return NextResponse.redirect(menuUrl);
   }

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