import { getServerSession } from 'next-auth';
import { authOptions } from './[...nextauth]';

export default async function handler(req, res) {
  try {
    console.log('Processing /api/auth/me request...'); // Отладка
    const session = await getServerSession(req, res, authOptions);
    
    console.log('Session retrieved:', session); // Отладка

    if (!session) {
      return res.status(401).json({ message: 'Не авторизован' });
    }
    
    res.status(200).json({ user: session.user });
  } catch (error) {
    console.error('Ошибка /api/auth/me:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
}
