import Cookies from 'cookies';

export default async function handler(req, res) {
  // Разрешаем только GET запросы
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Получаем параметры запроса
    const { login } = req.query;
    
    if (!login) {
      return res.status(400).json({ error: 'Login parameter is required' });
    }
    
    // Получаем токен доступа из cookies
    const cookies = new Cookies(req, res);
    const accessToken = cookies.get('twitch_access_token');
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Unauthorized - No access token' });
    }
    
    // Получаем данные пользователя из Twitch API
    const twitchResponse = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`, {
      method: 'GET',
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!twitchResponse.ok) {
      console.error('Twitch API error:', await twitchResponse.text());
      return res.status(twitchResponse.status).json({ 
        error: `Failed to fetch user data from Twitch API: ${twitchResponse.statusText}`,
        status: twitchResponse.status
      });
    }
    
    const userData = await twitchResponse.json();
    
    // Если пользователь не найден
    if (!userData.data || userData.data.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Возвращаем данные пользователя
    return res.status(200).json(userData);
  } catch (error) {
    console.error('Error in search API:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
} 