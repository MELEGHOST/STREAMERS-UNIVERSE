// Обработчик callback от Twitch для обмена кода на токен
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    const { code } = req.body;

    // Здесь должна быть логика обмена кода на токен через Twitch API
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET, // Убедись, что эта переменная добавлена в Vercel
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.TWITCH_REDIRECT_URI, // Убедись, что это https://streamers-universe.vercel.app/auth
      }),
    });

    console.log('Twitch token response:', { status: response.status, statusText: response.statusText }); // Отладка

    if (!response.ok) throw new Error('Не удалось получить токен от Twitch');

    const tokenData = await response.json();
    const accessToken = tokenData.access_token;

    // Получаем данные пользователя через Twitch API
    const userResponse = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) throw new Error('Не удалось получить данные пользователя');

    const userData = await userResponse.json();
    const user = userData.data[0];
    const followersResponse = await fetch(`https://api.twitch.tv/helix/users/follows?to_id=${user.id}`, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!followersResponse.ok) throw new Error('Не удалось получить данные о подписчиках');

    const followersData = await followersResponse.json();
    const followers = followersData.total || 0;

    // Возвращаем данные пользователя
    res.status(200).json({
      user: {
        id: user.id,
        name: user.display_name,
        followers: followers,
        isStreamer: followers >= 265, // Автоматически определяем стримеров с 265+ подписчиков
      },
      token: accessToken,
    });
  } catch (error) {
    console.error('Ошибка в callback Twitch:', error);
    res.status(500).json({ error: error.message });
  }
}
