export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }
    
    // В реальном приложении здесь был бы обмен кода на токен с Twitch API
    // Для демонстрации просто возвращаем моковые данные
    
    return res.status(200).json({
      token: 'demo_access_token_' + Math.random().toString(36).substring(2, 15),
      user: {
        id: '12345',
        name: 'ТестовыйСтример',
        email: 'test@example.com',
        followers: 300,
        isStreamer: true
      }
    });
  } catch (error) {
    console.error('Error in /api/auth/twitch/callback:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
