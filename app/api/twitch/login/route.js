import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    // Получаем параметры для авторизации
    const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_TWITCH_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL}/api/twitch/callback`;
    
    // Проверяем наличие необходимых параметров
    if (!clientId) {
      console.error('Отсутствует NEXT_PUBLIC_TWITCH_CLIENT_ID в переменных окружения');
      return NextResponse.json({ error: 'Ошибка конфигурации сервера' }, { status: 500 });
    }
    
    if (!redirectUri) {
      console.error('Отсутствует NEXT_PUBLIC_TWITCH_REDIRECT_URI в переменных окружения');
      return NextResponse.json({ error: 'Ошибка конфигурации сервера' }, { status: 500 });
    }
    
    // Формируем URL для авторизации
    const scope = 'user:read:email user:read:follows';
    const responseType = 'code';
    const authUrl = new URL('https://id.twitch.tv/oauth2/authorize');
    
    // Добавляем параметры
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', responseType);
    authUrl.searchParams.append('scope', scope);
    authUrl.searchParams.append('force_verify', 'true'); // Всегда запрашивать подтверждение
    
    // Добавляем состояние для защиты от CSRF
    const state = Math.random().toString(36).substring(2, 15);
    authUrl.searchParams.append('state', state);
    
    // Сохраняем состояние в куки для проверки при возврате
    const cookieStore = cookies();
    cookieStore.set('twitch_auth_state', state, { 
      path: '/', 
      httpOnly: true, 
      sameSite: 'lax', 
      maxAge: 3600 
    });
    
    // Логируем URL для отладки
    console.log('Redirecting to Twitch auth URL:', authUrl.toString());
    
    // Перенаправляем пользователя на страницу авторизации Twitch
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Ошибка при авторизации через Twitch:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера', message: error.message }, { status: 500 });
  }
} 