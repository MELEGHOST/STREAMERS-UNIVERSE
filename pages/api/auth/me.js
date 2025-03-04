import { getServerSession } from 'next-auth/next';
import { getAuthOptions } from './[...nextauth]'; // Путь для подкаталога auth

export default async function handler(req, res) {
  try {
    console.log('Processing /api/auth/me request...', {
      method: req.method,
      url: req.url,
      headers: req.headers,
    }); // Отладка
    const session = await getServerSession(req, res, getAuthOptions());
    
    console.log('Session retrieved:', session ? session : 'No session'); // Отладка

    if (!session) {
      return res.status(401).json({ message: 'Не авторизован' });
    }
    
    res.status(200).json({ user: session.user });
  } catch (error) {
    console.error('Ошибка /api/auth/me:', {
      error,
      stack: error.stack,
      method: req.method,
      url: req.url,
    });
    res.status(500).json({ message: 'Внутренняя ошибка сервера', error: error.message });
  }
}
