import { getServerSession } from 'next-auth/next';
import { authOptions } from './[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Очистка cookies через NextAuth.js или вручную
    res.setHeader('Set-Cookie', [
      'next-auth.session-token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0', // Очистка сессии NextAuth
      'twitchToken=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0', // Очистка кастомного токена
      'twitchUser=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0', // Очистка данных пользователя
    ]);

    // Выход через NextAuth.js (опционально, если требуется полная очистка сессии)
    await new Promise((resolve) => {
      req.session.destroy(() => resolve(true));
    });

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout: ' + error.message });
  }
}
