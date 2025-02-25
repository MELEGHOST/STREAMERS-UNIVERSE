// API-маршрут для безопасной передачи конфигурации клиенту
export default function handler(req, res) {
  // Проверяем метод запроса (должны принимать только GET)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Получаем значения из переменных окружения
  const twitchClientId = process.env.TWITCH_CLIENT_ID;
  const twitchRedirectUri = process.env.TWITCH_REDIRECT_URI;

  // Проверяем, существуют ли переменные
  if (!twitchClientId || !twitchRedirectUri) {
    return res.status(500).json({ error: 'Configuration not found. Check environment variables in Vercel.' });
  }

  // Возвращаем конфигурацию клиенту
  res.status(200).json({
    TWITCH_CLIENT_ID: twitchClientId,
    TWITCH_REDIRECT_URI: twitchRedirectUri
  });
}
