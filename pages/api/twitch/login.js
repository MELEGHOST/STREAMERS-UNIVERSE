export default function handler(req, res) {
  console.log('Pages Router: Login request started:', new Date().toISOString());

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

  // Устанавливаем заголовки для куков
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Устанавливаем state в cookie для последующей проверки
  res.setHeader('Set-Cookie', `twitch_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);

  console.log('State cookie set successfully');
  
  // Перенаправляем на страницу авторизации Twitch
  res.redirect(twitchAuthUrl);
} 