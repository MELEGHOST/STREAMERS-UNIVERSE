// Обработчик для получения данных текущего пользователя и списка профилей
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не поддерживается' });
  }

  try {
    const token = req.headers.authorization?.split(' ')[1]; // Извлекаем токен из заголовка

    if (!token) {
      return res.status(401).json({ error: 'Токен авторизации отсутствует' });
    }

    // Получаем данные текущего пользователя через Twitch API
    const userResponse = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!userResponse.ok) throw new Error('Не удалось получить данные пользователя');

    const userData = await userResponse.json();
    const user = userData.data[0];
    const followersResponse = await fetch(`https://api.twitch.tv/helix/users/follows?to_id=${user.id}`, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!followersResponse.ok) throw new Error('Не удалось получить данные о подписчиках');

    const followersData = await followersResponse.json();
    const followers = followersData.total || 0;

    // Возвращаем данные текущего пользователя
    res.status(200).json({
      user: {
        id: user.id,
        name: user.display_name,
        followers: followers,
        isStreamer: followers >= 265,
      },
      isAuthenticated: true,
    });
  } catch (error) {
    console.error('Ошибка в /api/auth/me:', error);
    res.status(500).json({ error: error.message });
  }
}
