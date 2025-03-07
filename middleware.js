import { NextResponse } from 'next/server';

export function middleware(request) {
  // Получаем текущий URL
  const url = request.nextUrl.clone();
  const { pathname } = url;
  
  console.log('Middleware обрабатывает запрос:', pathname);
  
  // Пропускаем запросы к /api/twitch/login без изменений
  if (pathname === '/api/twitch/login') {
    console.log('Middleware: пропускаем запрос к /api/twitch/login без изменений');
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
    // Добавьте другие разрешенные домены
  ];
  
  // Проверяем, является ли origin разрешенным
  const isAllowedOrigin = origin && allowedOrigins.includes(origin);
  
  // Устанавливаем заголовки CORS только для разрешенных доменов
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Origin', isAllowedOrigin ? origin : allowedOrigins[0]);
  response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  
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
    
    console.log('Middleware: проверка авторизации:', {
      twitch_access_token: hasTwitchAccessToken ? 'присутствует' : 'отсутствует',
      twitch_user: hasTwitchUser ? 'присутствует' : 'отсутствует',
      authorization_header: hasAuthHeader ? 'присутствует' : 'отсутствует',
      auth_header_value: authHeader ? authHeader.substring(0, 15) + '...' : 'отсутствует',
      domain: request.headers.get('host'),
      protocol: request.headers.get('x-forwarded-proto') || 'http'
    });
    
    // Если это запрос к API профиля и нет токена доступа, проверяем заголовок Authorization
    if (pathname === '/api/twitch/profile') {
      console.log('Middleware: обработка запроса к API профиля');
      
      // Если нет ни куки, ни заголовка, перенаправляем на страницу авторизации
      if (!hasTwitchAccessToken && !hasAuthHeader) {
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
        }
      }
    }
  }
  
  return response;
}

// Функция для генерации случайной строки без использования crypto
function generateRandomString(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  
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