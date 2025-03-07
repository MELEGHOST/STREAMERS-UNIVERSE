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
    console.log('Followings API - Начало обработки запроса');
    
    // Получаем параметры запроса
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const cursor = url.searchParams.get('cursor') || null;
    
    // Ограничиваем размер страницы
    const pageSize = Math.min(limit, 100);
    
    // Получаем токен доступа из cookies
    const cookieStore = cookies();
    let accessToken = cookieStore.get('twitch_access_token')?.value;

    console.log('Followings API - accessToken из cookies:', accessToken ? 'присутствует' : 'отсутствует');
    
    // Если токен не найден в cookies, проверяем заголовок Authorization
    const authHeader = request.headers.get('authorization');
    if (!accessToken && authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7);
        console.log('Followings API - accessToken из заголовка Authorization:', 'присутствует');
      }
    }

    // Проверяем, что токен не пустой и не undefined
    if (!accessToken || accessToken === 'undefined' || accessToken === 'null') {
      console.error('Followings API - Токен доступа не найден или недействителен');
      return NextResponse.json({ 
        error: 'Не авторизован', 
        message: 'Токен доступа не найден или недействителен. Пожалуйста, войдите снова.' 
      }, { status: 401 });
    }

    // Получаем данные пользователя
    console.log('Followings API - Запрос данных пользователя...');
    
    const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.data.data || userResponse.data.data.length === 0) {
      console.error('Followings API - Пользователь не найден в ответе Twitch API');
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    const user = userResponse.data.data[0];
    const userId = user.id;

    console.log('Followings API - Данные пользователя получены:', { userId, displayName: user.display_name });

    // Получаем подписки пользователя с пагинацией
    console.log(`Followings API - Запрос подписок для страницы ${page}...`);
    
    const queryParams = new URLSearchParams({
      from_id: userId,
      first: pageSize
    });
    
    if (cursor) {
      queryParams.append('after', cursor);
    }
    
    const followingsResponse = await axios.get(
      `https://api.twitch.tv/helix/users/follows?${queryParams.toString()}`, 
      {
        headers: {
          'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    // Получаем общее количество подписок
    const totalFollowingsCount = followingsResponse.data.total || 0;
    
    // Получаем данные подписок
    const followings = followingsResponse.data.data || [];
    
    // Получаем курсор для следующей страницы
    const nextCursor = followingsResponse.data.pagination?.cursor;
    
    console.log(`Followings API - Получено ${followings.length} подписок из ${totalFollowingsCount}`);
    
    // Если есть подписки, получаем дополнительную информацию о каждом стримере
    let followingsWithDetails = followings;
    
    if (followings.length > 0) {
      // Получаем ID всех стримеров, на которых подписан пользователь
      const streamerIds = followings.map(f => f.to_id);
      
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
      followingsWithDetails = followings.map(following => {
        const streamer = streamersMap[following.to_id] || {};
        return {
          id: following.to_id,
          name: following.to_name,
          login: following.to_login,
          followedAt: following.followed_at,
          profileImageUrl: streamer.profile_image_url || '',
          description: streamer.description || '',
          broadcasterType: streamer.broadcaster_type || '',
          viewCount: streamer.view_count || 0
        };
      });
      
      console.log(`Followings API - Получена дополнительная информация о ${followingsWithDetails.length} стримерах`);
    }
    
    // Формируем ответ
    const response = {
      total: totalFollowingsCount,
      page,
      pageSize,
      hasNextPage: !!nextCursor,
      nextCursor,
      followings: followingsWithDetails
    };
    
    return NextResponse.json(sanitizeObject(response));
  } catch (error) {
    console.error('Followings API error:', error);
    
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
      message: error.message || 'Неизвестная ошибка при получении данных подписок'
    }, { status: 500 });
  }
} 