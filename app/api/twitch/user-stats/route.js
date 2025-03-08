import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import axios from 'axios';

// Функция для экранирования HTML-тегов
function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Функция для очистки объекта от потенциально опасных данных
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        result[key] = escapeHtml(value);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = sanitizeObject(value);
      } else {
        result[key] = value;
      }
    }
  }
  
  return result;
}

export async function GET(request) {
  try {
    console.log('User Stats API - Начало обработки запроса');
    
    // Получаем токен доступа из cookies
    const cookieStore = cookies();
    let accessToken = cookieStore.get('twitch_access_token')?.value;

    console.log('User Stats API - accessToken из cookies:', accessToken ? 'присутствует' : 'отсутствует');
    
    // Если токен не найден в cookies, проверяем заголовок Authorization
    const authHeader = request.headers.get('authorization');
    if (!accessToken && authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7);
        console.log('User Stats API - accessToken из заголовка Authorization:', 'присутствует');
      }
    }

    // Проверяем, что токен не пустой и не undefined
    if (!accessToken || accessToken === 'undefined' || accessToken === 'null') {
      console.error('User Stats API - Токен доступа не найден или недействителен');
      return NextResponse.json({ 
        error: 'Не авторизован', 
        message: 'Токен доступа не найден или недействителен. Пожалуйста, войдите снова.' 
      }, { status: 401 });
    }

    // Получаем данные пользователя
    console.log('User Stats API - Запрос данных пользователя...');
    
    const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.data.data || userResponse.data.data.length === 0) {
      console.error('User Stats API - Пользователь не найден в ответе Twitch API');
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    const user = userResponse.data.data[0];
    const userId = user.id;
    const login = user.login;

    console.log('User Stats API - Данные пользователя получены:', { userId, displayName: user.display_name });

    // Создаем объект для хранения всех данных
    const userStats = {
      user: {
        id: user.id,
        login: user.login,
        displayName: user.display_name,
        profileImageUrl: user.profile_image_url,
        description: user.description,
        createdAt: user.created_at,
        broadcasterType: user.broadcaster_type,
        viewCount: user.view_count
      },
      followers: {
        total: 0,
        recentFollowers: []
      },
      followings: {
        total: 0,
        recentFollowings: []
      },
      stream: {
        isLive: false,
        currentStream: null,
        lastStream: null,
        recentStreams: []
      },
      channel: {
        subscribers: 0,
        hasSubscriptionProgram: false
      },
      birthday: null // Будет заполнено из локального хранилища, если доступно
    };

    // Получаем информацию о подписчиках (followers) с пагинацией
    try {
      console.log('User Stats API - Запрос информации о подписчиках...');
      
      // Получаем первую страницу подписчиков (последние 20)
      const followersResponse = await axios.get(
        `https://api.twitch.tv/helix/users/follows?to_id=${userId}&first=20`, 
        {
          headers: {
            'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      
      userStats.followers.total = followersResponse.data.total || 0;
      
      // Получаем последних подписчиков
      const recentFollowers = followersResponse.data.data || [];
      
      if (recentFollowers.length > 0) {
        // Получаем ID последних подписчиков
        const followerIds = recentFollowers.map(f => f.from_id);
        
        // Получаем подробную информацию о последних подписчиках
        const followersDetailResponse = await axios.get(
          `https://api.twitch.tv/helix/users?${followerIds.map(id => `id=${id}`).join('&')}`, 
          {
            headers: {
              'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );
        
        const followersDetailData = followersDetailResponse.data.data || [];
        
        // Создаем карту подписчиков для быстрого доступа
        const followersMap = {};
        followersDetailData.forEach(follower => {
          followersMap[follower.id] = follower;
        });
        
        // Объединяем данные подписок с данными подписчиков
        userStats.followers.recentFollowers = recentFollowers.map(follower => {
          const followerDetail = followersMap[follower.from_id] || {};
          return {
            id: follower.from_id,
            name: follower.from_name,
            login: follower.from_login,
            followedAt: follower.followed_at,
            profileImageUrl: followerDetail.profile_image_url || '',
            description: followerDetail.description || '',
            broadcasterType: followerDetail.broadcaster_type || ''
          };
        });
      }
      
      console.log(`User Stats API - Получена информация о ${userStats.followers.total} подписчиках`);
    } catch (error) {
      console.error('User Stats API - Ошибка при получении информации о подписчиках:', error.message);
    }

    // Получаем информацию о подписках (followings) с пагинацией
    try {
      console.log('User Stats API - Запрос информации о подписках...');
      
      // Получаем первую страницу подписок (последние 20)
      const followingsResponse = await axios.get(
        `https://api.twitch.tv/helix/users/follows?from_id=${userId}&first=20`, 
        {
          headers: {
            'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      
      userStats.followings.total = followingsResponse.data.total || 0;
      
      // Получаем последние подписки
      const recentFollowings = followingsResponse.data.data || [];
      
      if (recentFollowings.length > 0) {
        // Получаем ID стримеров, на которых подписан пользователь
        const streamerIds = recentFollowings.map(f => f.to_id);
        
        // Получаем подробную информацию о стримерах
        const streamersResponse = await axios.get(
          `https://api.twitch.tv/helix/users?${streamerIds.map(id => `id=${id}`).join('&')}`, 
          {
            headers: {
              'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );
        
        const streamersData = streamersResponse.data.data || [];
        
        // Создаем карту стримеров для быстрого доступа
        const streamersMap = {};
        streamersData.forEach(streamer => {
          streamersMap[streamer.id] = streamer;
        });
        
        // Объединяем данные подписок с данными стримеров
        userStats.followings.recentFollowings = recentFollowings.map(following => {
          const streamer = streamersMap[following.to_id] || {};
          return {
            id: following.to_id,
            name: following.to_name,
            login: following.to_login,
            followedAt: following.followed_at,
            profileImageUrl: streamer.profile_image_url || '',
            description: streamer.description || '',
            broadcasterType: streamer.broadcaster_type || ''
          };
        });
      }
      
      console.log(`User Stats API - Получена информация о ${userStats.followings.total} подписках`);
    } catch (error) {
      console.error('User Stats API - Ошибка при получении информации о подписках:', error.message);
    }

    // Получаем информацию о текущем стриме
    try {
      console.log('User Stats API - Запрос информации о стриме...');
      
      const streamResponse = await axios.get(
        `https://api.twitch.tv/helix/streams?user_id=${userId}`, 
        {
          headers: {
            'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      
      const streamData = streamResponse.data.data || [];
      
      if (streamData.length > 0) {
        const stream = streamData[0];
        userStats.stream.isLive = true;
        userStats.stream.currentStream = {
          id: stream.id,
          title: stream.title,
          gameId: stream.game_id,
          gameName: stream.game_name,
          type: stream.type,
          viewerCount: stream.viewer_count,
          startedAt: stream.started_at,
          language: stream.language,
          thumbnailUrl: stream.thumbnail_url
        };
      }
      
      console.log(`User Stats API - Пользователь ${userStats.stream.isLive ? 'в эфире' : 'не в эфире'}`);
    } catch (error) {
      console.error('User Stats API - Ошибка при получении информации о стриме:', error.message);
    }

    // Получаем информацию о последних стримах (видео)
    try {
      console.log('User Stats API - Запрос информации о последних стримах...');
      
      const videosResponse = await axios.get(
        `https://api.twitch.tv/helix/videos?user_id=${userId}&first=5&type=archive`, 
        {
          headers: {
            'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      
      const videos = videosResponse.data.data || [];
      
      if (videos.length > 0) {
        // Сохраняем информацию о последнем стриме
        const lastVideo = videos[0];
        userStats.stream.lastStream = {
          id: lastVideo.id,
          title: lastVideo.title,
          description: lastVideo.description,
          createdAt: lastVideo.created_at,
          publishedAt: lastVideo.published_at,
          url: lastVideo.url,
          thumbnailUrl: lastVideo.thumbnail_url,
          viewCount: lastVideo.view_count,
          language: lastVideo.language,
          duration: lastVideo.duration
        };
        
        // Сохраняем информацию о последних стримах
        userStats.stream.recentStreams = videos.map(video => ({
          id: video.id,
          title: video.title,
          createdAt: video.created_at,
          url: video.url,
          thumbnailUrl: video.thumbnail_url,
          viewCount: video.view_count,
          duration: video.duration
        }));
      }
      
      console.log(`User Stats API - ${videos.length > 0 ? 'Получена информация о последних стримах' : 'Нет информации о последних стримах'}`);
    } catch (error) {
      console.error('User Stats API - Ошибка при получении информации о последних стримах:', error.message);
    }

    // Получаем информацию о подписчиках канала (subscribers)
    try {
      console.log('User Stats API - Запрос информации о подписчиках канала...');
      
      // Проверяем, есть ли у пользователя программа подписки
      const subscriptionResponse = await axios.get(
        `https://api.twitch.tv/helix/subscriptions?broadcaster_id=${userId}&first=1`, 
        {
          headers: {
            'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      
      // Если запрос успешен, значит у пользователя есть программа подписки
      userStats.channel.hasSubscriptionProgram = true;
      userStats.channel.subscribers = subscriptionResponse.data.total || 0;
      
      console.log(`User Stats API - Получена информация о ${userStats.channel.subscribers} подписчиках канала`);
    } catch (error) {
      // Если ошибка 404 или 403, значит у пользователя нет программы подписки
      if (error.response && (error.response.status === 404 || error.response.status === 403)) {
        userStats.channel.hasSubscriptionProgram = false;
        console.log('User Stats API - У пользователя нет программы подписки');
      } else {
        console.error('User Stats API - Ошибка при получении информации о подписчиках канала:', error.message);
      }
    }

    return NextResponse.json(sanitizeObject(userStats));
  } catch (error) {
    console.error('User Stats API error:', error);
    
    if (error.response) {
      console.error('Детали ошибки API:', {
        status: error.response.status,
        data: error.response.data
      });
      
      if (error.response.status === 401) {
        return NextResponse.json({ 
          error: 'Срок действия токена авторизации истёк',
          message: 'Пожалуйста, войдите снова.'
        }, { status: 401 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Ошибка сервера', 
      message: error.message || 'Неизвестная ошибка при получении данных пользователя'
    }, { status: 500 });
  }
} 