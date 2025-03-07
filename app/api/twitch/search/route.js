import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

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
    // Получаем параметры запроса
    const url = new URL(request.url);
    const login = url.searchParams.get('login');
    
    if (!login) {
      return NextResponse.json({ error: 'Missing login parameter' }, { status: 400 });
    }
    
    // Валидация параметра login
    if (!/^[a-zA-Z0-9_]{1,25}$/.test(login)) {
      return NextResponse.json({ error: 'Invalid login parameter format' }, { status: 400 });
    }
    
    // Получаем токен доступа из cookies
    const cookieStore = cookies();
    const accessToken = cookieStore.get('twitch_access_token')?.value;
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Call Twitch API to get user data
    const twitchResponse = await fetch(
      `https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`, 
      {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!twitchResponse.ok) {
      if (twitchResponse.status === 401) {
        return NextResponse.json({ error: 'Authentication token expired' }, { status: 401 });
      }
      throw new Error(`Twitch API error: ${twitchResponse.status}`);
    }
    
    const twitchData = await twitchResponse.json();
    const twitchUser = twitchData.data[0];
    
    if (!twitchUser) {
      return NextResponse.json({ error: 'User not found on Twitch' }, { status: 404 });
    }

    // Get follower count
    const followerResponse = await fetch(
      `https://api.twitch.tv/helix/users/follows?to_id=${twitchUser.id}`, 
      {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!followerResponse.ok) {
      if (followerResponse.status === 401) {
        return NextResponse.json({ error: 'Authentication token expired' }, { status: 401 });
      }
      throw new Error(`Follower count error: ${followerResponse.status}`);
    }
    
    const followerData = await followerResponse.json();
    
    // Проверяем, зарегистрирован ли пользователь в Streamers Universe
    // Для этого можно проверить наличие данных в localStorage или в базе данных
    let isRegistered = true; // Всегда считаем, что пользователь зарегистрирован на Twitch
    let isRegisteredInSU = false; // Отдельный флаг для регистрации в Streamers Universe
    
    try {
      // Здесь можно добавить проверку в базе данных, если она есть
      // Пока просто считаем, что пользователь зарегистрирован, если его данные есть в Twitch
      
      // Добавляем дополнительную информацию для отладки
      console.log('Пользователь найден на Twitch:', twitchUser.login);
      console.log('ID пользователя:', twitchUser.id);
      console.log('Имя пользователя:', twitchUser.display_name);
      
      // Проверяем, зарегистрирован ли пользователь в Streamers Universe
      // Здесь должна быть проверка в базе данных
      // Пока просто случайно определяем для демонстрации
      isRegisteredInSU = Math.random() > 0.5;
    } catch (error) {
      console.error('Error checking registration status:', error);
    }
    
    // Получаем список стримеров, на которых подписан искомый пользователь
    let userFollowings = [];
    try {
      const followingsResponse = await fetch(
        `https://api.twitch.tv/helix/users/follows?from_id=${twitchUser.id}&first=100`, 
        {
          headers: {
            'Client-ID': process.env.TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      
      if (followingsResponse.ok) {
        const followingsData = await followingsResponse.json();
        userFollowings = followingsData.data.map(follow => follow.to_name);
        console.log('Получены подписки пользователя:', userFollowings.length);
      } else {
        console.error('Ошибка при получении подписок пользователя:', followingsResponse.status);
      }
    } catch (error) {
      console.error('Error fetching user followings:', error);
    }
    
    // Получаем список стримеров, на которых подписан текущий пользователь
    let currentUserFollowings = [];
    try {
      // Получаем ID текущего пользователя из куки
      const currentUserCookie = cookieStore.get('twitch_user')?.value;
      if (currentUserCookie) {
        const currentUser = JSON.parse(currentUserCookie);
        if (currentUser && currentUser.id) {
          const currentUserFollowingsResponse = await fetch(
            `https://api.twitch.tv/helix/users/follows?from_id=${currentUser.id}&first=100`, 
            {
              headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${accessToken}`,
              },
            }
          );
          
          if (currentUserFollowingsResponse.ok) {
            const currentUserFollowingsData = await currentUserFollowingsResponse.json();
            currentUserFollowings = currentUserFollowingsData.data.map(follow => follow.to_name);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching current user followings:', error);
    }
    
    // Находим общих стримеров
    const commonStreamers = userFollowings.filter(streamer => 
      currentUserFollowings.includes(streamer)
    );
    
    // Санитизация данных перед отправкой
    const sanitizedTwitchUser = sanitizeObject(twitchUser);
    
    return NextResponse.json({
      twitchData: sanitizedTwitchUser,
      isRegistered: isRegistered,
      isRegisteredInSU: isRegisteredInSU,
      followers: followerData.total,
      commonStreamers: commonStreamers,
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Server error', message: error.message }, { status: 500 });
  }
} 