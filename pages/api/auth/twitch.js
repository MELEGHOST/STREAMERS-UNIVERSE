import { getServerSession } from 'next-auth/next';
import { authOptions } from '../[...nextauth]';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // Redirect to the Twitch OAuth flow
    const baseUrl = `${process.env.NEXTAUTH_URL || `https://${req.headers.host}`}`;
    const callbackUrl = '/profile';
    
    // Construct the URL for the next-auth sign-in
    const url = `${baseUrl}/api/auth/signin/twitch?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    
    res.redirect(url);
  } catch (error) {
    console.error('Ошибка /api/auth/twitch:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
}
