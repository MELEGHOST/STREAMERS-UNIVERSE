import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  console.log('Login request started:', new Date().toISOString());

  // Получаем URL запроса
  const url = new URL(request.url);
  console.log('Request URL:', url.toString());

  // Проверяем конфигурацию
  if (!process.env.TWITCH_CLIENT_ID) {
    console.error('Отсутствует TWITCH_CLIENT_ID в переменных окружения');
    return NextResponse.json(
      { error: 'Отсутствует переменная окружения TWITCH_CLIENT_ID' }, 
      { status: 500 }
    );
  }

  // Динамически определяем URL обратного вызова на основе текущего домена
  const dynamicRedirectUri = `${url.origin}/api/twitch/callback`;
  console.log('Динамический Redirect URI:', dynamicRedirectUri);

  // Сохраняем динамический URL в cookie для использования в callback
  const cookieStore = cookies();
  cookieStore.set('dynamic_redirect_uri', dynamicRedirectUri, {
    httpOnly: true,
    secure: url.protocol === 'https:',
    sameSite: 'lax',
    maxAge: 600, // 10 минут
    path: '/'
  });

  // Создаем случайный state для CSRF-защиты - более надежный
  const state = Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  console.log('Generated state:', state);

  // Определяем необходимые разрешения
  const scopes = 'user:read:email user:read:follows';

  // Формируем URL для авторизации с динамическим URL обратного вызова
  const twitchAuthUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${
    process.env.TWITCH_CLIENT_ID
  }&redirect_uri=${
    encodeURIComponent(dynamicRedirectUri)
  }&response_type=code&scope=${
    encodeURIComponent(scopes)
  }&state=${state}`;

  console.log('Auth URL (without state):', twitchAuthUrl.replace(state, '[REDACTED]'));

  // Создаем ответ с редиректом
  const response = NextResponse.redirect(twitchAuthUrl);

  // Добавляем заголовки для разрешения куков
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Устанавливаем state в cookie для последующей проверки
  response.cookies.set('twitch_state', state, {
    httpOnly: true,
    secure: url.protocol === 'https:',
    sameSite: 'lax',
    maxAge: 600, // 10 минут
    path: '/'
  });

  console.log('State cookie set successfully');
  
  return response;
} 