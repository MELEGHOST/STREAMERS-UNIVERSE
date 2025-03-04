import { cookies } from 'next/headers';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    // Очищаем cookies
    cookies().delete('twitch_access_token');
    cookies().delete('twitch_refresh_token');
    cookies().delete('twitch_expires_at');
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
}
