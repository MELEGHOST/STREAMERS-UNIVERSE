export default function handler(req, res) {
  // Разрешаем только GET запросы
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Получаем URL для авторизации через Twitch
    const clientId = process.env.TWITCH_CLIENT_ID;
    const redirectUri = encodeURIComponent(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/twitch/callback`);
    const scope = encodeURIComponent('user:read:email user:read:follows');
    
    // Создаем URL для авторизации
    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
    
    // Перенаправляем пользователя на страницу авторизации Twitch
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error in login API:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
} 