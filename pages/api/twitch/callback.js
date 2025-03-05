import axios from 'axios';
import { cookies } from 'next/headers';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const { code, state } = Object.fromEntries(url.searchParams);
    if (!code) {
      return res.status(400).json({ error: 'Missing code' });
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

    // Используем cookies из next/headers в серверном контексте
    const cookieStore = cookies();
    cookieStore.set('twitch_access_token', access_token, { httpOnly: true, secure: true, maxAge: expires_in });
    cookieStore.set('twitch_refresh_token', refresh_token, { httpOnly: true, secure: true, maxAge: 30 * 24 * 60 * 60 });
    cookieStore.set('twitch_expires_at', expiresAt.toString(), { httpOnly: true, secure: true, maxAge: expires_in });

    res.redirect(302, '/profile?user=' + encodeURIComponent(JSON.stringify(userData)));
  } catch (error) {
    console.error('Twitch callback error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
}
