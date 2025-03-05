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

    if (!code) {
      return new Response(JSON.stringify({ error: 'Missing code' }), { status: 400 });
    }

    const baseUrl = 'https://streamers-universe.vercel.app';
    const redirectUri = `${baseUrl}/api/twitch/callback`;
    const tokenResponse = await axios.post('https://id.twitch.tv/oauth2/token', {
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

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

    const cookieStore = cookies();
    cookieStore.set('twitch_access_token', access_token, { httpOnly: true, secure: true, maxAge: expires_in });
    cookieStore.set('twitch_refresh_token', refresh_token, { httpOnly: true, secure: true, maxAge: 30 * 24 * 60 * 60 });
    cookieStore.set('twitch_expires_at', expiresAt.toString(), { httpOnly: true, secure: true, maxAge: expires_in });

    return new Response(null, {
      status: 302,
      headers: { Location: `/profile?user=${encodeURIComponent(JSON.stringify(userData))}` },
    });
  } catch (error) {
    console.error('Twitch callback error:', error);
    return new Response(JSON.stringify({ error: 'Server error', message: error.message }), { status: 500 });
  }
}
