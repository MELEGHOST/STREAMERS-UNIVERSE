import axios from 'axios';
import { cookies } from 'next/headers';

export async function GET(req) {
  try {
    // Явная проверка серверного контекста
    if (typeof window !== 'undefined') {
      throw new Error('This Route Handler must be called from the server');
    }

    const url = new URL(req.url);
    const { searchParams } = url;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    // Добавляем отладочные логи
    console.log('Callback request received with params:', {
      code: code ? 'present' : 'missing',
      state: state ? 'present' : 'missing',
    });

    // Обработка ошибок от Twitch
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    if (error) {
      console.error(`Twitch auth error: ${error} - ${errorDescription}`);
      return new Response(JSON.stringify({ error, description: errorDescription }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!code) {
      console.error('Missing code parameter in callback request');
      return new Response(JSON.stringify({ error: 'Missing code parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Используем TWITCH_REDIRECT_URI из env
    const redirectUri = process.env.TWITCH_REDIRECT_URI || 'https://streamers-universe.vercel.app/api/twitch/callback';

    // Используем URLSearchParams для form-urlencoded
    const params = new URLSearchParams();
    params.append('client_id', process.env.TWITCH_CLIENT_ID);
    params.append('client_secret', process.env.TWITCH_CLIENT_SECRET);
    params.append('code', code);
    params.append('grant_type', 'authorization_code');
    params.append('redirect_uri', redirectUri);

    console.log('Sending token request with params:', params.toString());

    const tokenResponse = await axios.post(
      'https://id.twitch.tv/oauth2/token',
      params.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    const expiresAt = Date.now() + (expires_in * 1000);

    const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${access_token}`,
      },
    });

    const user = userResponse.data.data[0];
    const userData = {
      id: user.id,
      isStreamer: false, // Логика для определения стримера
    };

    // Устанавливаем cookies
    const cookieStore = cookies();
    cookieStore.set('twitch_access_token', access_token, {
      httpOnly: true,
      secure: true,
      maxAge: expires_in,
    });
    cookieStore.set('twitch_refresh_token', refresh_token, {
      httpOnly: true,
      secure: true,
      maxAge: 30 * 24 * 60 * 60,
    });
    cookieStore.set('twitch_expires_at', expiresAt.toString(), {
      httpOnly: true,
      secure: true,
      maxAge: expires_in,
    });

    return new Response(null, {
      status: 302,
      headers: { Location: `/profile?user=${encodeURIComponent(JSON.stringify(userData))}` },
    });
  } catch (error) {
    console.error('Twitch callback error:', error);
    let errorMessage = 'Server error';
    if (error.response) {
      errorMessage = `Twitch API error: ${error.response.status} - ${error.response.data.message || error.response.data}`;
    }
    return new Response(JSON.stringify({ error: 'Server error', message: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
