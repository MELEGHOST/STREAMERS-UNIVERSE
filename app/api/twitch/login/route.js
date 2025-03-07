import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  console.log('Login request started:', new Date().toISOString());

  // Проверяем конфигурацию
  if (!process.env.TWITCH_CLIENT_ID) {
    console.error('Отсутствует TWITCH_CLIENT_ID в переменных окружения');
    return NextResponse.json(
      { error: 'Отсутствует переменная окружения TWITCH_CLIENT_ID' }, 
      { status: 500 }
    );
  }

  if (!process.env.TWITCH_REDIRECT_URI) {
    console.error('Отсутствует TWITCH_REDIRECT_URI в переменных окружения');
    return NextResponse.json(
      { error: 'Отсутствует переменная окружения TWITCH_REDIRECT_URI' }, 
      { status: 500 }
    );
  }

  // Используем правильный URI без .js в конце
  const redirectUri = process.env.TWITCH_REDIRECT_URI.replace(/\.js$/, '');

  // Создаем случайный state для CSRF-защиты - более надежный
  const state = Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  console.log('Generated state:', state);
  console.log('Redirect URI:', redirectUri);

  // Определяем необходимые разрешения
  const scopes = 'user:read:email user:read:follows';

  // Формируем URL для авторизации
  const twitchAuthUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${
    process.env.TWITCH_CLIENT_ID
  }&redirect_uri=${
    encodeURIComponent(redirectUri)
  }&response_type=code&scope=${
    encodeURIComponent(scopes)
  }&state=${state}`;

  console.log('Auth URL (without state):', twitchAuthUrl.replace(state, '[REDACTED]'));

  // Создаем ответ с редиректом
  const response = NextResponse.redirect(twitchAuthUrl);

  // Устанавливаем state в cookie для последующей проверки
  response.cookies.set('twitch_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 минут
    path: '/'
  });

  console.log('State cookie set successfully');
  
  return response;
} 