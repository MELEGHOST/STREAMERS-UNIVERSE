import { getServerSession } from 'next-auth/next';
import { authOptions } from './[...nextauth]';

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ message: 'Не авторизован' });
    }
    res.status(200).json({ user: session.user });
  } catch (error) {
    console.error('Ошибка /api/auth/me:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
