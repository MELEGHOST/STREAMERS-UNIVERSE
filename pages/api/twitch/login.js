import { serialize } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('Login request started:', new Date().toISOString());

  // Проверяем конфигурацию
  if (!process.env.TWITCH_CLIENT_ID) {
    console.error('Отсутствует TWITCH_CLIENT_ID в переменных окружения');
    return res.status(500).json({ error: 'Отсутствует переменная окружения TWITCH_CLIENT_ID' });
  }

  if (!process.env.TWITCH_REDIRECT_URI) {
    console.error('Отсутствует TWITCH_REDIRECT_URI в переменных окружения');
    return res.status(500).json({ error: 'Отсутствует переменная окружения TWITCH_REDIRECT_URI' });
  }

  // Используем правильный URI без .js в конце
  const redirectUri = process.env.TWITCH_REDIRECT_URI.replace(/\.js$/, '');

  // Создаем случайный state для CSRF-защиты - более надежный
  const state = Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  console.log('Generated state:', state);
  console.log('Redirect URI:', redirectUri);

  // Определяем необходимые разрешения
  const scopes = 'user:read:email user:read:follows';

  // Формируем URL для авторизации
  const twitchAuthUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${
    process.env.TWITCH_CLIENT_ID
  }&redirect_uri=${
    encodeURIComponent(redirectUri)
  }&response_type=code&scope=${
    encodeURIComponent(scopes)
  }&state=${state}`;

  console.log('Auth URL (without state):', twitchAuthUrl.replace(state, '[REDACTED]'));

  // Устанавливаем state в cookie для последующей проверки
  res.setHeader('Set-Cookie', serialize('twitch_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 минут
    path: '/'
  }));

  console.log('State cookie set successfully');
  
  // Перенаправляем на Twitch для авторизации
  res.redirect(twitchAuthUrl);
}
