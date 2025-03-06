import { NextResponse } from 'next/server';
import axios from 'axios';
import querystring from 'querystring';

export async function GET(request) {
  console.log('Callback started:', new Date().toISOString());
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  console.log('Received params:', { code: !!code, state: !!state });

  if (!code || !state) {
    console.error('Missing code or state:', { code, state });
    return NextResponse.json({ error: 'Отсутствует код или state' }, { status: 400 });
  }

  try {
    console.log('Environment check:', {
      TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID ? 'defined' : 'undefined',
      TWITCH_CLIENT_SECRET: !!process.env.TWITCH_CLIENT_SECRET,
      TWITCH_REDIRECT_URI: process.env.TWITCH_REDIRECT_URI,
    });

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
        maxRedirects: 0,
      }
    );

    console.log('Token response:', {
      status: tokenResponse.status,
      data: tokenResponse.data,
      headers: tokenResponse.headers,
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    if (!access_token || !refresh_token || !expires_in) {
      throw new Error('Invalid token response: ' + JSON.stringify(tokenResponse.data));
    }

    const expiresAt = new Date(Date.now() + expires_in * 1000);
    const response = NextResponse.redirect(new URL('/profile', request.url));

    // Минимальная установка cookies
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

    console.log('Cookies set:', {
      twitch_access_token: access_token.substring(0, 5) + '...',
      twitch_refresh_token: refresh_token.substring(0, 5) + '...',
      twitch_expires_at: expiresAt.toISOString(),
    });

    response.headers.append(
      'Set-Cookie',
      `twitch_state=; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
    );
    console.log('State cleared');

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
