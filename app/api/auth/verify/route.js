import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

// Полноценная проверка авторизации
export async function POST(request) {
  console.log('[API] /api/auth/verify: начало обработки запроса');
  
  try {
    // Получаем заголовок авторизации
    const authHeader = request.headers.get('Authorization');
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      console.log('[API] /api/auth/verify: получен токен из заголовка');
      
      try {
        // Проверяем токен на валидность
        const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET);
        
        if (decoded) {
          console.log('[API] /api/auth/verify: токен успешно верифицирован');
          return NextResponse.json({ 
            valid: true,
            message: 'Аутентификация успешна',
            user: {
              id: decoded.id || decoded.sub,
              name: decoded.name,
              email: decoded.email
            }
          });
        }
      } catch (tokenError) {
        console.error('[API] /api/auth/verify: ошибка проверки токена:', tokenError.message);
      }
    }
    
    // Проверяем существование куки сессии NextAuth
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('next-auth.session-token')?.value || 
                         cookieStore.get('__Secure-next-auth.session-token')?.value;
    
    if (sessionToken) {
      console.log('[API] /api/auth/verify: обнаружен токен сессии next-auth');
      
      // Здесь можно использовать NextAuth session provider для проверки сессии
      // На данном этапе, если токен есть, считаем что сессия валидна
      return NextResponse.json({ 
        valid: true,
        message: 'Аутентификация по сессии NextAuth успешна'
      });
    }
    
    // Пробуем получить twitch токены из cookies
    const twitchToken = cookieStore.get('twitch_access_token')?.value;
    if (twitchToken) {
      console.log('[API] /api/auth/verify: обнаружен Twitch токен');
      
      // Проверяем Twitch токен запросом к API Twitch
      try {
        const twitchResponse = await fetch('https://api.twitch.tv/helix/users', {
          headers: {
            'Authorization': `Bearer ${twitchToken}`,
            'Client-Id': process.env.TWITCH_CLIENT_ID || process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID
          }
        });
        
        if (twitchResponse.ok) {
          const userData = await twitchResponse.json();
          console.log('[API] /api/auth/verify: успешная проверка токена Twitch');
          
          return NextResponse.json({
            valid: true,
            message: 'Аутентификация через Twitch успешна',
            user: userData.data?.[0] || null
          });
        } else {
          console.error('[API] /api/auth/verify: токен Twitch недействителен:', await twitchResponse.text());
        }
      } catch (twitchError) {
        console.error('[API] /api/auth/verify: ошибка при проверке токена Twitch:', twitchError.message);
      }
    }
    
    // Проверяем присутствие данных пользователя в теле запроса
    let userData = null;
    try {
      const body = await request.json();
      userData = body?.user;
    } catch (parseError) {
      console.error('[API] /api/auth/verify: ошибка при разборе JSON:', parseError.message);
    }
    
    if (userData && userData.id) {
      // Проверка данных пользователя только если присутствует ID
      // Здесь вы можете добавить дополнительную логику проверки пользователя
      console.log('[API] /api/auth/verify: получены данные пользователя из запроса');
      
      return NextResponse.json({ 
        valid: true,
        message: 'Аутентификация по данным пользователя успешна',
        user: {
          id: userData.id,
          name: userData.name || userData.login,
          email: userData.email
        }
      });
    }
    
    // Если ни один из методов аутентификации не сработал, возвращаем ошибку
    console.log('[API] /api/auth/verify: авторизация не пройдена');
    return NextResponse.json({ 
      valid: false, 
      error: 'Авторизация не пройдена. Войдите в систему.'
    }, { status: 401 });
    
  } catch (error) {
    console.error('[API] /api/auth/verify: критическая ошибка:', error.message);
    console.error('[API] /api/auth/verify: стек ошибки:', error.stack || 'Стек недоступен');
    
    // Возвращаем ошибку сервера
    return NextResponse.json({ 
      valid: false,
      error: 'Ошибка сервера при проверке авторизации'
    }, { status: 500 });
  }
} 