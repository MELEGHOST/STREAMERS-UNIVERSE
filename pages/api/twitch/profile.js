import axios from 'axios';
import { parse } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Метод не разрешен' });
  }

  try {
    // Получаем токен доступа из cookies
    const cookies = parse(req.headers.cookie || '');
    const accessToken = cookies.twitch_access_token;

    console.log('Profile API - accessToken:', accessToken ? 'присутствует' : 'отсутствует');

    if (!accessToken) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    // Получаем данные пользователя
    const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.data.data || userResponse.data.data.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const user = userResponse.data.data[0];
    const userId = user.id;
    const twitchName = user.display_name;
    const profileImageUrl = user.profile_image_url; // Получаем URL аватарки напрямую из API

    // Получаем подписчиков с поддержкой пагинации
    let followers = [];
    let cursor = null;
    let hasMoreFollowers = true;
    let totalFollowersCount = 0;

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

      totalFollowersCount = followersResponse.data.total;
      followers = [...followers, ...followersResponse.data.data.map((f) => f.from_name)];

      if (followersResponse.data.pagination && followersResponse.data.pagination.cursor) {
        cursor = followersResponse.data.pagination.cursor;
      } else {
        hasMoreFollowers = false;
      }

      // Ограничиваем до 100 подписчиков для производительности
      if (followers.length >= 100) {
        hasMoreFollowers = false;
      }
    }

    // Получаем подписки пользователя с поддержкой пагинации
    let followings = [];
    cursor = null;
    let hasMoreFollowings = true;
    let totalFollowingsCount = 0;

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

      totalFollowingsCount = followingsResponse.data.total;
      followings = [...followings, ...followingsResponse.data.data.map((f) => f.to_name)];

      if (followingsResponse.data.pagination && followingsResponse.data.pagination.cursor) {
        cursor = followingsResponse.data.pagination.cursor;
      } else {
        hasMoreFollowings = false;
      }

      // Ограничиваем до 100 подписок для производительности
      if (followings.length >= 100) {
        hasMoreFollowings = false;
      }
    }

    // Формируем данные профиля
    const profileData = {
      twitchName,
      followersCount: totalFollowersCount || followers.length,
      followers,
      followingsCount: totalFollowingsCount || followings.length,
      followings,
      id: userId,
      profileImageUrl, // Добавляем URL аватарки
    };

    console.log('Возвращаемые данные профиля:', { 
      ...profileData, 
      followers: profileData.followers.length > 0 ? `${profileData.followers.length} подписчиков` : 'нет',
      followings: profileData.followings.length > 0 ? `${profileData.followings.length} подписок` : 'нет',
    });

    res.status(200).json(profileData);
  } catch (error) {
    console.error('Ошибка профиля Twitch:', error);
    
    if (error.response) {
      console.error('Детали ошибки API:', {
        status: error.response.status,
        data: error.response.data
      });
      
      if (error.response.status === 401) {
        return res.status(401).json({ error: 'Срок действия токена авторизации истёк' });
      }
    }
    
    res.status(500).json({ 
      error: 'Ошибка сервера', 
      message: error.message || 'Неизвестная ошибка при получении данных профиля'
    });
  }
}
