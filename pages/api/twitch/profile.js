import axios from 'axios';
import { parse } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не разрешен' });
  }

  try {
    // Правильная обработка cookies в API-роутах
    const cookies = parse(req.headers.cookie || '');
    const accessToken = cookies.twitch_access_token;

    console.log('Profile API - accessToken:', accessToken ? 'присутствует' : 'отсутствует');

    if (!accessToken) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    // Получение данных пользователя
    const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const user = userResponse.data.data[0];
    const userId = user.id;
    const twitchName = user.display_name;

    // Получение подписчиков - добавляем поддержку пагинации для больших аккаунтов
    let followers = [];
    let cursor = null;
    let hasMoreFollowers = true;

    while (hasMoreFollowers) {
      const url = cursor
        ? `https://api.twitch.tv/helix/users/follows?to_id=${userId}&after=${cursor}`
        : `https://api.twitch.tv/helix/users/follows?to_id=${userId}`;

      const followersResponse = await axios.get(url, {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      followers = [...followers, ...followersResponse.data.data.map((f) => f.from_name)];

      if (followersResponse.data.pagination && followersResponse.data.pagination.cursor) {
        cursor = followersResponse.data.pagination.cursor;
      } else {
        hasMoreFollowers = false;
      }

      // Ограничение до первых 100 для производительности
      if (followers.length >= 100) {
        hasMoreFollowers = false;
      }
    }

    // Получение подписок - добавляем поддержку пагинации
    let followings = [];
    cursor = null;
    let hasMoreFollowings = true;

    while (hasMoreFollowings) {
      const url = cursor
        ? `https://api.twitch.tv/helix/users/follows?from_id=${userId}&after=${cursor}`
        : `https://api.twitch.tv/helix/users/follows?from_id=${userId}`;

      const followingsResponse = await axios.get(url, {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      followings = [...followings, ...followingsResponse.data.data.map((f) => f.to_name)];

      if (followingsResponse.data.pagination && followingsResponse.data.pagination.cursor) {
        cursor = followingsResponse.data.pagination.cursor;
      } else {
        hasMoreFollowings = false;
      }

      // Ограничение до первых 100 для производительности
      if (followings.length >= 100) {
        hasMoreFollowings = false;
      }
    }

    res.status(200).json({
      twitchName,
      followersCount: followers.length,
      followers,
      followingsCount: followings.length,
      followings,
      id: userId, // Добавляем ID для загрузки аватарки
    });
  } catch (error) {
    console.error('Ошибка профиля Twitch:', error);
    if (error.response && error.response.status === 401) {
      return res.status(401).json({ error: 'Срок действия токена авторизации истёк' });
    }
    res.status(500).json({ error: 'Ошибка сервера', message: error.message });
  }
}
