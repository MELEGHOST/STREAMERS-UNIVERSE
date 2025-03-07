import { NextResponse } from 'next/server';

export function middleware(request) {
  // Получаем текущий URL
  const url = request.nextUrl.clone();
  const { pathname } = url;
  
  console.log('Middleware обрабатывает запрос:', pathname);
  
  // Клонируем текущий ответ
  const response = NextResponse.next();
  
  // Получаем origin запроса
  const origin = request.headers.get('origin') || '*';
  
  // Добавляем заголовки для разрешения куков и CORS
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Origin', origin);
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
  if (pathname.startsWith('/api/')) {
    console.log('Обработка API запроса в middleware:', pathname);
    
    // Проверяем наличие куков для отладки
    const cookies = request.cookies;
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
      
      // Если есть заголовок Authorization, пропускаем запрос
      if (hasAuthHeader) {
        console.log('Middleware: обнаружен заголовок Authorization, пропускаем запрос');
      }
    }
  }
  
  return response;
}

// Указываем, для каких путей применять middleware
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 