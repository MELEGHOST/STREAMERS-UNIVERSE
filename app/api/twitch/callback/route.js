import { NextResponse } from 'next/server';
import axios from 'axios';
import querystring from 'querystring';
import { getCookie, setCookie } from 'cookies-next';

export async function GET(request) {
  console.log('cookies-next imported successfully:', typeof getCookie === 'function' && typeof setCookie === 'function');
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  console.log('Callback request URL:', request.url);
  console.log('Callback received with:', { code: !!code, state: !!state });

  if (!code || !state) {
    console.error('Missing code or state:', { code, state });
    return NextResponse.json({ error: 'Отсутствует код или state' }, { status: 400 });
  }

  try {
    // Получаем сохранённый state из cookies
    const savedState = getCookie('twitch_state', { req: request });
    console.log('Saved state from cookie:', savedState);
    console.log('Received state from query:', state);

    if (!savedState) {
      console.error('No saved state found in cookies');
      throw new Error('Отсутствует сохранённый state в cookies');
    }

    if (savedState !== state) {
      console.error('State mismatch:', { savedState, receivedState: state });
      throw new Error('Несоответствие state, возможная атака CSRF');
    }

    // Проверяем переменные окружения
    console.log('Environment variables:', {
      TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID ? process.env.TWITCH_CLIENT_ID.substring(0, 5) + '...' : 'undefined',
      TWITCH_CLIENT_SECRET: !!process.env.TWITCH_CLIENT_SECRET,
      TWITCH_REDIRECT_URI: process.env.TWITCH_REDIRECT_URI,
    });

    // Обмен кода на токен
    const tokenParams = querystring.stringify({
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.TWITCH_REDIRECT_URI,
    });

    console.log('Token request params:', tokenParams);
    const tokenResponse = await axios.post(
      'https://id.twitch.tv/oauth2/token',
      tokenParams,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        maxRedirects: 0, // Отключаем редиректы для точного ответа
      }
    );

    console.log('Token response status:', tokenResponse.status);
    console.log('Token response headers:', tokenResponse.headers);
    console.log('Token response data:', tokenResponse.data);

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    if (!access_token || !refresh_token || !expires_in) {
      throw new Error('Invalid token response from Twitch: ' + JSON.stringify(tokenResponse.data));
    }

    // Сохранение токенов в cookies с минимальными настройками
    const expiresAt = new Date(Date.now() + expires_in * 1000);
    const cookieOptions = {
      httpOnly: true,
      path: '/', // Убраны secure и sameSite для теста
      expires: expiresAt,
    };

    const response = NextResponse.redirect(new URL('/profile', request.url));

    // Установка через Set-Cookie с минимальными настройками
    response.headers.append(
      'Set-Cookie',
      `twitch_access_token=${access_token}; HttpOnly; Path=/; Expires=${expiresAt.toUTCString()}`
    );
    response.headers.append(
      'Set-Cookie',
      `twitch_refresh_token=${refresh_token}; HttpOnly; Path=/; Expires=${expiresAt.toUTCString()}`
    );
    response.headers.append(
      'Set-Cookie',
      `twitch_expires_at=${expiresAt.toISOString()}; HttpOnly; Path=/; Expires=${expiresAt.toUTCString()}`
    );

    console.log('Set-Cookie headers applied:', {
      twitch_access_token: access_token.substring(0, 5) + '...',
      twitch_refresh_token: refresh_token.substring(0, 5) + '...',
      twitch_expires_at: expiresAt.toISOString(),
    });

    // Резерв через cookies-next
    setCookie('twitch_access_token', access_token, { ...cookieOptions, req, res: response });
    setCookie('twitch_refresh_token', refresh_token, { ...cookieOptions, req, res: response });
    setCookie('twitch_expires_at', expiresAt.toISOString(), { ...cookieOptions, req, res: response });
    console.log('Backup cookie set using cookies-next:', {
      twitch_access_token: access_token.substring(0, 5) + '...',
      twitch_refresh_token: refresh_token.substring(0, 5) + '...',
      twitch_expires_at: expiresAt.toISOString(),
    });

    // Удаляем state
    response.headers.append(
      'Set-Cookie',
      `twitch_state=; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
    );
    console.log('State cookie cleared');

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

    const followsResponse = await axios.get(`https://api.twitch.tv/helix/users/follows?to_id=${userId}`, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${access_token}`,
      },
    });

    const followersCount = followsResponse.data.total || 0;
    const isStreamer = followersCount >= 150;

    console.log(`User ${twitchName} has ${followersCount} followers, streamer status: ${isStreamer}`);

    const userData = {
      id: userId,
      name: twitchName,
      isStreamer,
      followersCount,
      profileImageUrl,
    };

    const url = new URL('/profile', request.url);
    url.searchParams.set('user', encodeURIComponent(JSON.stringify(userData)));
    response.headers.set('Location', url.toString());

    return response;
  } catch (error) {
    console.error('Authentication error:', {
      message: error.message,
      stack: error.stack,
      response: error.response ? {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      } : null,
    });

    const errorUrl = new URL('/auth', request.url);
    errorUrl.searchParams.set('error', 'auth_failed');
    errorUrl.searchParams.set('message', encodeURIComponent(error.message || 'Ошибка при обработке авторизации'));
    return NextResponse.redirect(errorUrl);
  }
}
