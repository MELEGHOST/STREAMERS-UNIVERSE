import { NextResponse } from 'next/server';

export function middleware(request) {
  // Получаем текущий URL
  const url = request.nextUrl.clone();
  const { pathname } = url;
  
  console.log('Middleware обрабатывает запрос:', pathname);
  
  // Клонируем текущий ответ
  const response = NextResponse.next();
  
  // Добавляем заголовки для разрешения куков
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Origin', request.headers.get('origin') || '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  // Если это запрос к API, проверяем наличие куков
  if (pathname.startsWith('/api/')) {
    console.log('Обработка API запроса в middleware:', pathname);
    
    // Для OPTIONS запросов сразу возвращаем ответ с заголовками CORS
    if (request.method === 'OPTIONS') {
      return response;
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