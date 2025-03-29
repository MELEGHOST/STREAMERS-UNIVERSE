import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import axios from 'axios';
import { sanitizeObject } from '@/utils/securityUtils';

export async function GET(request) {
  try {
    console.log('Followers API - Начало обработки запроса');
    
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

    console.log('Followers API - accessToken из cookies:', accessToken ? 'присутствует' : 'отсутствует');
    
    // Если токен не найден в cookies, проверяем заголовок Authorization
    const authHeader = request.headers.get('authorization');
    if (!accessToken && authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7);
        console.log('Followers API - accessToken из заголовка Authorization:', 'присутствует');
      }
    }

    // Проверяем, что токен не пустой и не undefined
    if (!accessToken || accessToken === 'undefined' || accessToken === 'null') {
      console.error('Followers API - Токен доступа не найден или недействителен');
      return NextResponse.json({ 
        error: 'Не авторизован', 
        message: 'Токен доступа не найден или недействителен. Пожалуйста, войдите снова.' 
      }, { status: 401 });
    }

    // Получаем данные пользователя
    console.log('Followers API - Запрос данных пользователя...');
    
    const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.data.data || userResponse.data.data.length === 0) {
      console.error('Followers API - Пользователь не найден в ответе Twitch API');
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    const user = userResponse.data.data[0];
    const userId = user.id;

    console.log('Followers API - Данные пользователя получены:', { userId, displayName: user.display_name });

    // Получаем подписчиков пользователя с пагинацией
    console.log(`Followers API - Запрос подписчиков для страницы ${page}...`);
    
    const queryParams = new URLSearchParams({
      to_id: userId,
      first: pageSize
    });
    
    if (cursor) {
      queryParams.append('after', cursor);
    }
    
    const followersResponse = await axios.get(
      `https://api.twitch.tv/helix/users/follows?${queryParams.toString()}`, 
      {
        headers: {
          'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    // Получаем общее количество подписчиков
    const totalFollowersCount = followersResponse.data.total || 0;
    
    // Получаем данные подписчиков
    const followers = followersResponse.data.data || [];
    
    // Получаем курсор для следующей страницы
    const nextCursor = followersResponse.data.pagination?.cursor;
    
    console.log(`Followers API - Получено ${followers.length} подписчиков из ${totalFollowersCount}`);
    
    // Если есть подписчики, получаем дополнительную информацию о каждом
    let followersWithDetails = followers;
    
    if (followers.length > 0) {
      // Получаем ID всех подписчиков
      const followerIds = followers.map(f => f.from_id);
      
      // Получаем подробную информацию о подписчиках
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
      followersWithDetails = followers.map(follower => {
        const followerDetail = followersMap[follower.from_id] || {};
        return {
          id: follower.from_id,
          name: follower.from_name,
          login: follower.from_login,
          followedAt: follower.followed_at,
          profileImageUrl: followerDetail.profile_image_url || '',
          description: followerDetail.description || '',
          broadcasterType: followerDetail.broadcaster_type || '',
          viewCount: followerDetail.view_count || 0
        };
      });
      
      console.log(`Followers API - Получена дополнительная информация о ${followersWithDetails.length} подписчиках`);
    }
    
    // Формируем ответ
    const response = {
      total: totalFollowersCount,
      page,
      pageSize,
      hasNextPage: !!nextCursor,
      nextCursor,
      followers: followersWithDetails
    };
    
    return NextResponse.json(sanitizeObject(response));
  } catch (error) {
    console.error('Followers API error:', error);
    
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
      message: error.message || 'Неизвестная ошибка при получении данных подписчиков'
    }, { status: 500 });
  }
} 