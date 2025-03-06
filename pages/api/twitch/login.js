import { setCookie } from 'cookies-next';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не разрешен' });
  }

  if (!process.env.TWITCH_CLIENT_ID) {
    return res.status(500).json({ error: 'Отсутствует переменная окружения TWITCH_CLIENT_ID' });
  }

  if (!process.env.TWITCH_REDIRECT_URI) {
    return res.status(500).json({ error: 'Отсутствует переменная окружения TWITCH_REDIRECT_URI' });
  }

  const redirectUri = process.env.TWITCH_REDIRECT_URI;

  // Создаем случайный state для безопасности
  const state = Math.random().toString(36).substring(2);

  // Сохраняем state в cookies с явной проверкой
  const setStateResult = setCookie('twitch_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 минут
    path: '/',
  }, { req, res });
  console.log('State set in cookie:', { state, result: setStateResult });

  // Определяем необходимые разрешения
  const scopes = 'user:read:email user:read:follows';

  console.log('Redirect URI:', redirectUri);

  // Формируем URL для авторизации
  const twitchAuthUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${
    process.env.TWITCH_CLIENT_ID
  }&redirect_uri=${
    encodeURIComponent(redirectUri)
  }&response_type=code&scope=${
    encodeURIComponent(scopes)
  }&state=${state}`;

  console.log('Auth URL:', twitchAuthUrl);

  // Перенаправляем пользователя
  res.redirect(302, twitchAuthUrl);
}
