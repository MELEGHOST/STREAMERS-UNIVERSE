export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не разрешен' });
  }
  
  // Используем точный URI редиректа из переменных окружения
  const redirectUri = process.env.TWITCH_REDIRECT_URI;
  
  if (!redirectUri) {
    return res.status(500).json({ error: 'Отсутствует переменная окружения TWITCH_REDIRECT_URI' });
  }
  
  // Создаем случайный state для безопасности
  const state = Math.random().toString(36).substring(2);
  
  // Определяем необходимые разрешения
  // user:read:email для доступа к email пользователя
  // user:read:follows для получения подписчиков и подписок
  const scopes = 'user:read:email user:read:follows';
  
  // Формируем URL для авторизации
  const twitchAuthUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${
    process.env.TWITCH_CLIENT_ID
  }&redirect_uri=${
    encodeURIComponent(redirectUri)
  }&response_type=code&scope=${
    encodeURIComponent(scopes)
  }&state=${state}`;
  
  // Перенаправляем пользователя на страницу авторизации Twitch
  res.redirect(302, twitchAuthUrl);
}
