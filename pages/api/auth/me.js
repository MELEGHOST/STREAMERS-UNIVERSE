export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Проверяем токен из заголовка Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No valid token' });
    }

    const token = authHeader.split(' ')[1]; // Извлекаем токен
    // Здесь можно добавить проверку токена через Twitch API или другую логику
    // Пока возвращаем тестовые данные, если токен есть
    const storedUser = localStorage.getItem('user'); // Это работает только на клиенте, поэтому имитируем
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      return res.status(200).json(userData);
    }

    return res.status(401).json({ error: 'Unauthorized: No user data' });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
