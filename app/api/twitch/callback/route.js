import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code || !state) {
    return NextResponse.json({ error: 'Отсутствует код или state' }, { status: 400 });
  }

  try {
    // Обмен кода на токен
    const tokenResponse = await axios.post(
      'https://id.twitch.tv/oauth2/token',
      {
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.TWITCH_REDIRECT_URI,
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Сохранение токенов в cookies с правильными настройками
    const expiresAt = new Date(Date.now() + expires_in * 1000).toUTCString();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Только для HTTPS в продакшене
      sameSite: 'lax', // Убрали 'as const'
      expires: new Date(expiresAt),
    };

    const response = NextResponse.redirect(new URL('/profile', request.url));
    response.cookies.set('twitch_access_token', access_token, cookieOptions);
    response.cookies.set('twitch_refresh_token', refresh_token, cookieOptions);
    response.cookies.set('twitch_expires_at', expiresAt, cookieOptions);

    console.log('Сохранённые токены:', {
      access_token: access_token.substring(0, 5) + '...', // Логируем только начало для безопасности
      refresh_token: refresh_token.substring(0, 5) + '...',
      expires_at: expiresAt,
    });

    // Получение данных пользователя
    const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${access_token}`,
      },
    });

    const user = userResponse.data.data[0];
    const userId = user.id;
    const twitchName = user.display_name;

    // Проверка статуса стримера через количество фолловеров
    const followsResponse = await axios.get(`https://api.twitch.tv/helix/users/follows?to_id=${userId}`, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${access_token}`,
      },
    });

    const followersCount = followsResponse.data.total || 0;
    const isStreamer = followersCount >= 150; // Исправляем порог на 150 подписчиков

    // Сохраняем данные в URL для профиля
    const userData = {
      id: userId,
      name: twitchName,
      isStreamer,
      followersCount
    };

    // Добавляем данные пользователя в параметр URL
    const profileUrl = new URL('/profile', request.url);
    profileUrl.searchParams.set('user', encodeURIComponent(JSON.stringify(userData)));
    
    return response;
  } catch (error) {
    console.error('Ошибка авторизации:', error);
    
    const errorResponse = NextResponse.redirect(new URL('/auth', request.url));
    errorResponse.searchParams.set('error', 'auth_failed');
    
    return errorResponse;
  }
}
