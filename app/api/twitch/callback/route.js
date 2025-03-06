import { NextResponse } from 'next/server';
import axios from 'axios';
import querystring from 'querystring';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code || !state) {
    return NextResponse.json({ error: 'Отсутствует код или state' }, { status: 400 });
  }

  try {
    // Обмен кода на токен с правильным форматированием данных
    const tokenParams = querystring.stringify({
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.TWITCH_REDIRECT_URI,
    });

    // Исправленный запрос токена с корректными заголовками
    const tokenResponse = await axios.post(
      'https://id.twitch.tv/oauth2/token',
      tokenParams,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Логирование для отладки (можно удалить в продакшне)
    console.log('Получен токен доступа:', access_token ? 'успешно' : 'ошибка');

    // Сохранение токенов в cookies с правильными настройками
    const expiresAt = new Date(Date.now() + expires_in * 1000).toUTCString();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    };

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
    const profileImageUrl = user.profile_image_url;

    // Проверка статуса стримера через количество фолловеров
    const followsResponse = await axios.get(`https://api.twitch.tv/helix/users/follows?to_id=${userId}`, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${access_token}`,
      },
    });

    const followersCount = followsResponse.data.total || 0;
    
    // Определяем статус стримера на основе количества подписчиков
    const isStreamer = followersCount >= 150;
    
    console.log(`Пользователь ${twitchName} имеет ${followersCount} подписчиков, статус стримера: ${isStreamer}`);

    // Создаем URL для редиректа
    const url = new URL('/profile', request.url);
    
    // Создаем ответ с редиректом
    const response = NextResponse.redirect(url);
    
    // Устанавливаем куки с максимальным сроком действия
    response.cookies.set('twitch_access_token', access_token, cookieOptions);
    response.cookies.set('twitch_refresh_token', refresh_token, cookieOptions);
    response.cookies.set('twitch_expires_at', expiresAt, cookieOptions);

    // Добавляем данные пользователя в параметр URL
    const userData = {
      id: userId,
      name: twitchName,
      isStreamer: isStreamer,
      followersCount,
      profileImageUrl
    };

    // Добавляем параметры пользователя в URL
    url.searchParams.set('user', encodeURIComponent(JSON.stringify(userData)));
    
    return response;
  } catch (error) {
    console.error('Ошибка авторизации:', error);
    
    // Более подробное логирование ошибки для отладки
    if (error.response) {
      console.error('Детали ошибки:', {
        status: error.response.status,
        data: error.response.data
      });
    }
    
    // Создаем URL с ошибкой и более информативным сообщением
    const errorUrl = new URL('/auth', request.url);
    errorUrl.searchParams.set('error', 'auth_failed');
    errorUrl.searchParams.set('message', encodeURIComponent(error.message || 'Ошибка при обработке авторизации'));
    
    return NextResponse.redirect(errorUrl);
  }
}
