export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Проверяем токен из заголовка Authorization
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]; // Извлекаем токен
      
      // Предположим, что мы проверили токен (в реальном приложении здесь будет проверка)
      // Поскольку localStorage недоступен на сервере, мы будем использовать моковые данные для демонстрации
      if (token) {
        // Для демонстрационных целей возвращаем тестовые данные пользователя
        return res.status(200).json({
          user: {
            id: '12345',
            name: 'ТестовыйСтример',
            email: 'test@example.com',
            followers: 300,
            isStreamer: true
          },
          isAuthenticated: true,
          isStreamer: true,
          followers: 300
        });
      }
    }

    // Если токена нет, возвращаем данные по умолчанию (неавторизованный пользователь)
    return res.status(200).json({
      user: null,
      isAuthenticated: false,
      isStreamer: false,
      followers: 0,
    });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
