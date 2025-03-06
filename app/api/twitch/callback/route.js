import { NextResponse } from 'next/server';
import axios from 'axios';
import querystring from 'querystring';
import { cookies } from 'next/cookies';

export async function GET(request) {
  console.log('Callback started:', new Date().toISOString(), 'URL:', request.url);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const receivedState = searchParams.get('state');

  console.log('Received params:', { code: !!code, state: !!receivedState, fullUrl: request.url });

  if (!code || !receivedState) {
    console.error('Missing code or state:', { code, state: receivedState });
    return NextResponse.redirect(new URL(`/auth?error=auth_failed&message=${encodeURIComponent('Отсутствует код или state')}`, request.url));
  }

  // Получаем state из cookies для проверки
  const cookieStore = cookies();
  const storedState = cookieStore.get('twitch_state')?.value;
  
  console.log('State comparison:', { 
    receivedState, 
    storedState, 
    match: receivedState === storedState 
  });

  // Проверяем соответствие state для CSRF-защиты
  if (!storedState || receivedState !== storedState) {
    console.error('State mismatch, possible CSRF attack:', { 
      receivedState, 
      storedState 
    });
    return NextResponse.redirect(
      new URL(`/auth?error=auth_failed&message=${encodeURIComponent('Несоответствие state, возможная атака CSRF')}`, request.url)
    );
  }

  try {
    console.log('Environment check:', {
      TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID ? process.env.TWITCH_CLIENT_ID.substring(0, 5) + '...' : 'undefined',
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
      headers: tokenResponse.headers,
      data: tokenResponse.data,
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    if (!access_token || !refresh_token || !expires_in) {
      throw new Error('Invalid token response: ' + JSON.stringify(tokenResponse.data));
    }

    const expiresAt = new Date(Date.now() + expires_in * 1000);
    const response = NextResponse.redirect(new URL('/profile', request.url));

    // Установка cookies
    response.cookies.set('twitch_access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: expiresAt,
      path: '/'
    });
    
    response.cookies.set('twitch_refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: expiresAt,
      path: '/'
    });
    
    response.cookies.set('twitch_expires_at', expiresAt.toISOString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: expiresAt,
      path: '/'
    });

    console.log('Cookies set:', {
      twitch_access_token: access_token.substring(0, 5) + '...',
      twitch_refresh_token: refresh_token.substring(0, 5) + '...',
      twitch_expires_at: expiresAt.toISOString(),
    });

    // Очистка state cookie после успешной авторизации
    response.cookies.set('twitch_state', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(0),
      path: '/'
    });
    
    console.log('State cookie cleared');

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
      request: error.request ? {
        method: error.request.method,
        url: error.request.path,
        headers: error.request._header,
      } : null,
    });

    const errorUrl = new URL('/auth', request.url);
    errorUrl.searchParams.set('error', 'auth_failed');
    errorUrl.searchParams.set('message', encodeURIComponent(error.message || 'Ошибка при обработке авторизации'));
    return NextResponse.redirect(errorUrl);
  }
}
