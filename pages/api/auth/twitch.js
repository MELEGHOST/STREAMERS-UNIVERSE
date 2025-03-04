import { getServerSession } from 'next-auth/next';
import { getAuthOptions } from '../auth/[...nextauth]'; // Убедимся, что путь корректен

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, getAuthOptions());
    console.log('Current session before Twitch sign-in:', session);

    const baseUrl = `${process.env.NEXTAUTH_URL || `https://${req.headers.host}`}`;
    const callbackUrl = '/profile';
    
    // Редирект на встроенный маршрут NextAuth
    return res.redirect(`/api/auth/signin/twitch?callbackUrl=${encodeURIComponent(`${baseUrl}${callbackUrl}`)}`);
  } catch (error) {
    console.error('Twitch sign-in error:', {
      error,
      stack: error.stack,
      method: req.method,
      url: req.url,
    });
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
}
