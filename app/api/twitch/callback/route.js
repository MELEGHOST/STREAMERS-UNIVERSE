import { NextResponse } from 'next/server';
import axios from 'axios';
import querystring from 'querystring';
import { getCookie, setCookie } from 'cookies-next';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

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
      }
    );

    console.log('Token response received:', tokenResponse.data);

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    if (!access_token || !refresh_token || !expires_in) {
      throw new Error('Invalid token response from Twitch');
    }

    // Сохранение токенов в cookies с отладкой
    const expiresAt = new Date(Date.now() + expires_in * 1000).toUTCString();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development', // Разрешаем на dev без HTTPS
      sameSite: 'lax',
      path: '/',
      maxAge: expires_in,
    };

    const response = NextResponse.redirect(new URL('/profile', request.url));
    const cookieResults = {
      twitch_access_token: response.cookies.set('twitch_access_token', access_token, cookieOptions),
      twitch_refresh_token: response.cookies.set('twitch_refresh_token', refresh_token, cookieOptions),
      twitch_expires_at: response.cookies.set('twitch_expires_at', expiresAt, cookieOptions),
    };
    console.log('Cookie set results:', cookieResults);

    // Удаляем state после использования
    response.cookies.set('twitch_state', '', { ...cookieOptions, maxAge: 0 });
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

    // Проверка статуса стримера
    const followsResponse = await axios.get(`https://api.twitch.tv/helix/users/follows?to_id=${userId}`, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${access_token}`,
      },
    });

    const followersCount = followsResponse.data.total || 0;
    const isStreamer = followersCount >= 150;

    console.log(`User ${twitchName} has ${followersCount} followers, streamer status: ${isStreamer}`);

    // Передача данных в URL
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
    console.error('Authentication error:', error);

    if (error.response) {
      console.error('Error details:', {
        status: error.response.status,
        data: error.response.data,
      });
    } else {
      console.error('Unknown error:', error.message);
    }

    const errorUrl = new URL('/auth', request.url);
    errorUrl.searchParams.set('error', 'auth_failed');
    errorUrl.searchParams.set('message', encodeURIComponent(error.message || 'Ошибка при обработке авторизации'));
    return NextResponse.redirect(errorUrl);
  }
}
