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

// Функция для проверки, зарегистрирован ли пользователь в Streamers Universe
async function checkUserRegistrationInSU(userId) {
  try {
    // Здесь должна быть проверка в базе данных
    // Пока просто имитируем проверку
    
    // В реальном приложении здесь будет запрос к базе данных
    // Например: const user = await db.users.findOne({ twitchId: userId });
    
    // Для демонстрации используем случайное значение
    // В реальном приложении вернуть: return !!user;
    return Math.random() > 0.5;
  } catch (error) {
    console.error('Error checking user registration:', error);
    return false;
  }
}

// Функция для получения социальных ссылок пользователя
async function getUserSocialLinks(userId) {
  try {
    // В реальном приложении здесь будет запрос к базе данных
    // Например: const socialLinks = await db.socialLinks.findOne({ userId });
    
    // Для демонстрации возвращаем пустой объект или имитацию данных
    if (Math.random() > 0.7) {
      return {
        twitch: `https://twitch.tv/${userId}`,
        youtube: Math.random() > 0.5 ? `https://youtube.com/c/user${userId}` : null,
        discord: Math.random() > 0.5 ? `https://discord.gg/invite${userId}` : null,
        telegram: Math.random() > 0.5 ? `https://t.me/user${userId}` : null,
        vk: Math.random() > 0.5 ? `https://vk.com/id${userId}` : null,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching user social links:', error);
    return null;
  }
}

// Функция для проверки, подписан ли текущий пользователь на найденного пользователя
async function checkIfUserIsFollowed(currentUserId, targetUserId, accessToken) {
  try {
    if (!currentUserId || !targetUserId) return false;
    
    const followResponse = await fetch(
      `https://api.twitch.tv/helix/users/follows?from_id=${currentUserId}&to_id=${targetUserId}`, 
      {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!followResponse.ok) {
      console.error('Error checking follow status:', followResponse.status);
      return false;
    }
    
    const followData = await followResponse.json();
    return followData.data && followData.data.length > 0;
  } catch (error) {
    console.error('Error checking if user is followed:', error);
    return false;
  }
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
    
    let followerCount = 0;
    
    if (followerResponse.ok) {
      const followerData = await followerResponse.json();
      followerCount = followerData.total || 0;
    } else {
      console.error('Error fetching follower count:', followerResponse.status);
    }
    
    // Определяем, является ли пользователь стримером (более 265 фолловеров)
    const isStreamer = followerCount >= 265;
    
    // Проверяем, зарегистрирован ли пользователь в Streamers Universe
    const isRegisteredInSU = await checkUserRegistrationInSU(twitchUser.id);
    
    // Получаем социальные ссылки пользователя, если он зарегистрирован в SU
    const socialLinks = isRegisteredInSU ? await getUserSocialLinks(twitchUser.id) : null;
    
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
    
    // Получаем ID текущего пользователя
    let currentUserId = null;
    try {
      const currentUserCookie = cookieStore.get('twitch_user')?.value;
      if (currentUserCookie) {
        const currentUser = JSON.parse(currentUserCookie);
        currentUserId = currentUser?.id;
      }
    } catch (error) {
      console.error('Error getting current user ID:', error);
    }
    
    // Проверяем, подписан ли текущий пользователь на найденного пользователя
    const isFollowed = await checkIfUserIsFollowed(currentUserId, twitchUser.id, accessToken);
    
    // Санитизация данных перед отправкой
    const sanitizedTwitchUser = sanitizeObject(twitchUser);
    
    return NextResponse.json({
      twitchData: sanitizedTwitchUser,
      isStreamer: isStreamer,
      isRegisteredInSU: isRegisteredInSU,
      isFollowed: isFollowed,
      followers: followerCount,
      commonStreamers: commonStreamers,
      socialLinks: sanitizeObject(socialLinks),
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Server error', message: error.message }, { status: 500 });
  }
} 