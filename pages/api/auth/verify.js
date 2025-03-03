import { getServerSession } from 'next-auth/next';
import { authOptions } from './[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, user } = req.body;
    if (!token || !user) {
      return res.status(400).json({ error: 'Missing token or user data' });
    }

    console.log('Verifying token:', { token, user }); // Отладка

    // Проверяем токен через Twitch API
    try {
      const response = await fetch('https://id.twitch.tv/oauth2/validate', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      console.log('Twitch API response:', { status: response.status, ok: response.ok }); // Отладка

      if (!response.ok) {
        throw new Error('Invalid token');
      }
      const data = await response.json();
      console.log('Twitch API data:', data); // Отладка

      if (data.client_id !== process.env.TWITCH_CLIENT_ID) {
        throw new Error('Token client ID mismatch');
      }
    } catch (error) {
      console.error('Token validation error:', {
        error,
        stack: error.stack,
        token,
        user,
      });
      return res.status(401).json({ error: 'Invalid or expired token', valid: false });
    }

    // Если токен валиден, возвращаем успех
    res.status(200).json({ valid: true, user });
  } catch (error) {
    console.error('Verify error:', {
      error,
      stack: error.stack,
      method: req.method,
      url: req.url,
    });
    res.status(500).json({ error: 'Failed to verify token: ' + error.message, valid: false });
  }
}
