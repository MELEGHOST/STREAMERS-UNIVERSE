export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не разрешен' });
  }
  
  // Проверяем наличие необходимых переменных окружения
  if (!process.env.TWITCH_CLIENT_ID) {
    return res.status(500).json({ error: 'Отсутствует переменная окружения TWITCH_CLIENT_ID' });
  }
  
  if (!process.env.TWITCH_REDIRECT_URI) {
    return res.status(500).json({ error: 'Отсутствует переменная окружения TWITCH_REDIRECT_URI' });
  }
  
  // Используем точный URI редиректа из переменных окружения
  const redirectUri = process.env.TWITCH_REDIRECT_URI;
  
  // Создаем случайный state для безопасности
  const state = Math.random().toString(36).substring(2);
  
  // Определяем необходимые разрешения
  // user:read:email для доступа к email пользователя
  // user:read:follows для получения подписчиков и подписок
  const scopes = 'user:read:email user:read:follows';
  
  // Логируем URL для отладки (можно удалить в продакшне)
  console.log('Redirect URI:', redirectUri);
  
  // Формируем URL для авторизации
  const twitchAuthUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${
    process.env.TWITCH_CLIENT_ID
  }&redirect_uri=${
    encodeURIComponent(redirectUri)
  }&response_type=code&scope=${
    encodeURIComponent(scopes)
  }&state=${state}`;
  
  // Логируем сформированный URL (можно удалить в продакшне)
  console.log('Auth URL:', twitchAuthUrl);
  
  // Перенаправляем пользователя на страницу авторизации Twitch
  res.redirect(302, twitchAuthUrl);
}
