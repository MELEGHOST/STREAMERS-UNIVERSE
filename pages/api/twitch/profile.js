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
    const profileImageUrl = user.profile_image_url;

    // Получаем подписчиков (с ограничением для производительности)
    let followers = [];
    let cursor = null;
    let hasMoreFollowers = true;
    let totalFollowersCount = 0;
    let followerFetchAttempts = 0;
    const MAX_FETCH_ATTEMPTS = 3; // Limit pagination attempts for performance

    while (hasMoreFollowers && followerFetchAttempts < MAX_FETCH_ATTEMPTS) {
      followerFetchAttempts++;
      const url = cursor
        ? `https://api.twitch.tv/helix/users/follows?to_id=${userId}&after=${cursor}`
        : `https://api.twitch.tv/helix/users/follows?to_id=${userId}`;

      try {
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
      } catch (err) {
        console.error('Error fetching followers:', err.message);
        hasMoreFollowers = false;
      }
    }

    // Получаем подписки пользователя (с ограничением для производительности)
    let followings = [];
    cursor = null;
    let hasMoreFollowings = true;
    let totalFollowingsCount = 0;
    let followingFetchAttempts = 0;

    while (hasMoreFollowings && followingFetchAttempts < MAX_FETCH_ATTEMPTS) {
      followingFetchAttempts++;
      const url = cursor
        ? `https://api.twitch.tv/helix/users/follows?from_id=${userId}&after=${cursor}`
        : `https://api.twitch.tv/helix/users/follows?from_id=${userId}`;

      try {
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
      } catch (err) {
        console.error('Error fetching followings:', err.message);
        hasMoreFollowings = false;
      }
    }

    // Определяем статус стримера (подписчиков >= 150)
    const isStreamer = totalFollowersCount >= 150;
    
    console.log(`Проверка статуса стримера: ${totalFollowersCount} подписчиков, статус: ${isStreamer ? 'стример' : 'зритель'}`);

    // Формируем данные профиля
    const profileData = {
      twitchName,
      followersCount: totalFollowersCount || followers.length,
      followers,
      followingsCount: totalFollowingsCount || followings.length,
      followings,
      id: userId,
      profileImageUrl,
      isStreamer, // Добавляем статус стримера в данные профиля
    };

    // Логируем подробную информацию о данных профиля
    console.log('Возвращаемые данные профиля:', { 
      twitchName,
      followersCount: totalFollowersCount,
      followersData: followers.length > 0 ? `${followers.length} подписчиков загружено` : 'нет данных',
      followingsCount: totalFollowingsCount,
      followingsData: followings.length > 0 ? `${followings.length} подписок загружено` : 'нет данных',
      isStreamer,
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
