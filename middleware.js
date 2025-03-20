import { NextResponse } from 'next/server';

export function middleware(request) {
  // Получаем текущий URL
  const url = request.nextUrl.clone();
  const { pathname } = url;
  
  console.log('Middleware обрабатывает запрос:', pathname);
  
  // Логируем для отладки, если запрос связан с Twitch callback
  if (pathname.startsWith('/api/twitch/callback')) {
    console.log('[Middleware] Обработка Twitch callback', pathname);
    console.log('[Middleware] TWITCH_REDIRECT_URI:', process.env.TWITCH_REDIRECT_URI);
    console.log('[Middleware] NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
  }
  
  // Пропускаем запросы к API авторизации без изменений
  if (pathname.startsWith('/api/auth') || 
      pathname.startsWith('/api/twitch/login') || 
      pathname.startsWith('/api/twitch/callback') || 
      pathname.startsWith('/api/twitch/token')) {
    // Для запросов авторизации не применяем дополнительных преобразований
    // Это позволяет избежать проблем с CORS и авторизацией
    return;
  }
  
  // Пропускаем запросы к меню без проверки авторизации
  if (pathname === '/menu') {
    console.log('Middleware: пропускаем запрос к меню без проверки авторизации');
    return NextResponse.next();
  }
  
  // Клонируем текущий ответ
  const response = NextResponse.next();
  
  // Генерируем CSRF-токен, если его нет в куках
  const cookies = request.cookies;
  if (!cookies.has('csrf_token')) {
    // Генерируем случайный токен с использованием Web Crypto API вместо Node.js crypto
    const csrfToken = generateRandomString(32);
    
    // Устанавливаем токен в куки
    response.cookies.set('csrf_token', csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 // 1 день
    });
    
    console.log('Middleware: сгенерирован новый CSRF-токен');
  }
  
  // Добавляем заголовки безопасности
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.twitch.tv https://*.jtvnw.net; connect-src 'self' https://api.twitch.tv https://id.twitch.tv; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none';");
  
  // Получаем origin запроса
  const origin = request.headers.get('origin');
  
  // Список разрешенных доменов
  const allowedOrigins = [
    'https://streamers-universe.vercel.app',
    'https://streamers-universe.com',
    'https://streamers-universe-meleghost-meleghosts-projects.vercel.app',
    // Локальные домены для разработки
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    // Добавьте другие разрешенные домены
  ];
  
  // Проверяем, является ли origin разрешенным
  const isAllowedOrigin = origin && allowedOrigins.includes(origin);
  
  // Устанавливаем заголовки CORS только для разрешенных доменов
  if (isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  } else if (origin) {
    // Если origin не в списке разрешенных, не устанавливаем заголовок Access-Control-Allow-Origin
    console.log(`Middleware: Origin ${origin} не разрешен`);
  }
  
  // Для OPTIONS запросов сразу возвращаем ответ с заголовками CORS
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: response.headers,
    });
  }
  
  // Если это запрос к API, проверяем наличие куков
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/twitch/login') && !pathname.startsWith('/api/twitch/callback')) {
    console.log('Обработка API запроса в middleware:', pathname);
    
    // Проверяем наличие куков для отладки
    const hasTwitchAccessToken = cookies.has('twitch_access_token');
    const hasTwitchUser = cookies.has('twitch_user');
    
    // Проверяем наличие заголовка Authorization
    const hasAuthHeader = request.headers.has('Authorization');
    const authHeader = request.headers.get('Authorization');
    
    // Проверяем наличие токена в localStorage через куки
    const hasLocalStorageToken = cookies.has('has_local_storage_token');
    
    console.log('Middleware: проверка авторизации:', {
      twitch_access_token: hasTwitchAccessToken ? 'присутствует' : 'отсутствует',
      twitch_user: hasTwitchUser ? 'присутствует' : 'отсутствует',
      authorization_header: hasAuthHeader ? 'присутствует' : 'отсутствует',
      auth_header_value: authHeader ? authHeader.substring(0, 15) + '...' : 'отсутствует',
      has_local_storage_token: hasLocalStorageToken ? 'присутствует' : 'отсутствует',
      domain: request.headers.get('host'),
      protocol: request.headers.get('x-forwarded-proto') || 'http'
    });
    
    // Если это запрос к API профиля
    if (pathname === '/api/twitch/profile') {
      console.log('Middleware: обработка запроса к API профиля');
      
      // Если нет ни куки, ни заголовка, перенаправляем на страницу авторизации
      if (!hasTwitchAccessToken && !hasAuthHeader && !hasLocalStorageToken) {
        console.log('Middleware: отсутствует токен доступа и заголовок Authorization, перенаправление на /auth');
        return NextResponse.redirect(new URL('/auth?clear_auth=true', request.url));
      }
      
      // Если есть заголовок Authorization, пропускаем запрос и добавляем заголовок для безопасной передачи токена
      if (hasAuthHeader) {
        console.log('Middleware: обнаружен заголовок Authorization, пропускаем запрос');
        
        // Извлекаем токен из заголовка
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          
          // Добавляем токен в заголовок ответа для безопасной обработки на клиенте
          response.headers.set('X-Auth-Token', token);
          
          // Устанавливаем куку для отслеживания наличия токена
          response.cookies.set('has_auth_header', 'true', {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 // 1 день
          });
        }
      }
      
      // Добавляем заголовок для указания типа запроса (AJAX или обычный)
      const isAjaxRequest = request.headers.get('X-Requested-With') === 'XMLHttpRequest' || 
                           request.headers.get('Accept')?.includes('application/json');
      
      if (isAjaxRequest) {
        response.headers.set('X-Request-Type', 'ajax');
      } else {
        response.headers.set('X-Request-Type', 'regular');
      }
    }
  }
  
  // Проверяем доступ к защищенным страницам (кроме меню)
  if (pathname === '/profile' || 
      pathname === '/search' || 
      pathname === '/followings' || 
      pathname === '/followers' || 
      pathname === '/questions' || 
      pathname === '/settings') {
    
    // ОТКЛЮЧАЕМ ПРОВЕРКИ И ПЕРЕНАПРАВЛЕНИЯ ДЛЯ ЗАЩИЩЕННЫХ СТРАНИЦ
    // Просто пропускаем запрос дальше
    return NextResponse.next();
  }
  
  return response;
}

// Функция для генерации случайной строки с использованием более безопасного метода
function generateRandomString(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  
  try {
    // Используем crypto API для более безопасной генерации случайных чисел
    const randomValues = new Uint8Array(length);
    
    // Используем crypto.getRandomValues если доступно
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomValues);
      
      for (let i = 0; i < length; i++) {
        result += characters.charAt(randomValues[i] % charactersLength);
      }
      return result;
    }
  } catch (error) {
    console.error('Ошибка при использовании crypto API:', error);
  }
    
  // Запасной вариант, если crypto API недоступен или произошла ошибка
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  
  return result;
}

// Указываем, для каких путей применять middleware
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 