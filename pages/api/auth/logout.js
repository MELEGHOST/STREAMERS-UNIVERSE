export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Очищаем данные авторизации
    localStorage.removeItem('user'); // Это работает только на клиенте, поэтому имитируем
    localStorage.removeItem('token');

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error in /api/auth/logout:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
