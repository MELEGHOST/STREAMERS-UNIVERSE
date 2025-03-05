import axios from 'axios';
import { cookies } from 'next/headers';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { code, state } = req.query;
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state' });
    }

    const redirectUri = `${process.env.NEXTAUTH_URL || `https://${req.headers.host}`}/api/auth/twitch/callback`;
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

    // Получаем данные пользователя
    const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${access_token}`,
      },
    });
    const user = userResponse.data.data[0];
    const userData = {
      id: user.id,
      isStreamer: false, // Здесь можно добавить логику определения стримера, если нужно
    };

    // Сохраняем токены в cookies
    cookies().set('twitch_access_token', access_token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: expires_in });
    cookies().set('twitch_refresh_token', refresh_token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 30 * 24 * 60 * 60 });
    cookies().set('twitch_expires_at', expiresAt.toString(), { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: expires_in });

    // Сохраняем данные пользователя в localStorage на стороне клиента через редирект с параметрами
    res.redirect(`/profile?user=${encodeURIComponent(JSON.stringify(userData))}`);
  } catch (error) {
    console.error('Twitch callback error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
}
