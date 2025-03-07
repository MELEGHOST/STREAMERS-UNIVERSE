import { NextResponse } from 'next/server';

export function middleware(request) {
  // Клонируем текущий ответ
  const response = NextResponse.next();
  
  // Добавляем заголовки для разрешения куков
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Origin', request.headers.get('origin') || '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  return response;
}

// Указываем, для каких путей применять middleware
export const config = {
  matcher: [
    '/api/:path*',
    '/auth/:path*',
    '/profile/:path*'
  ],
}; 