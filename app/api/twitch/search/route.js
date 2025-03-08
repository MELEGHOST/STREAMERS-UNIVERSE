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

/**
 * Проверяет, зарегистрирован ли пользователь в Streamers Universe
 * @param {string} userId - ID пользователя для проверки
 * @param {object} cookies - Объект с куками для проверки
 * @returns {boolean} - true, если пользователь зарегистрирован, иначе false
 */
function checkUserRegistrationInSU(userId, cookies) {
  try {
    // Все пользователи Twitch считаются зарегистрированными в Streamers Universe
    return true;
  } catch (error) {
    console.error('Ошибка при проверке регистрации пользователя:', error);
    return true; // В случае ошибки также считаем пользователя зарегистрированным
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

    // Проверяем наличие TWITCH_CLIENT_ID в переменных окружения
    if (!process.env.TWITCH_CLIENT_ID) {
      console.error('TWITCH_CLIENT_ID не найден в переменных окружения');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Получаем данные пользователя из Twitch API
    const twitchUserResponse = await fetch(`https://api.twitch.tv/helix/users?login=${login}`, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!twitchUserResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch user data from Twitch API' }, { status: twitchUserResponse.status });
    }

    const twitchUserData = await twitchUserResponse.json();

    if (!twitchUserData.data || twitchUserData.data.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const twitchUser = twitchUserData.data[0];

    // Получаем количество фолловеров пользователя
    const followersResponse = await fetch(`https://api.twitch.tv/helix/users/follows?to_id=${twitchUser.id}`, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`
      }
    });

    let follower_count = 0;
    if (followersResponse.ok) {
      const followersData = await followersResponse.json();
      follower_count = followersData.total || 0;
    }

    // Получаем количество фолловингов пользователя
    const followingResponse = await fetch(`https://api.twitch.tv/helix/users/follows?from_id=${twitchUser.id}`, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`
      }
    });

    let following_count = 0;
    if (followingResponse.ok) {
      const followingData = await followingResponse.json();
      following_count = followingData.total || 0;
    }

    // Добавляем данные о фолловерах и фолловингах к объекту пользователя
    twitchUser.follower_count = follower_count;
    twitchUser.following_count = following_count;

    // Определяем, является ли пользователь стримером (более 265 фолловеров)
    const isStreamer = follower_count >= 265;
    
    // Проверяем, зарегистрирован ли пользователь в Streamers Universe
    const isRegisteredInSU = checkUserRegistrationInSU(twitchUser.id, cookieStore);
    
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
      followers: follower_count,
      commonStreamers: commonStreamers,
      socialLinks: sanitizeObject(socialLinks),
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Server error', message: error.message }, { status: 500 });
  }
} 