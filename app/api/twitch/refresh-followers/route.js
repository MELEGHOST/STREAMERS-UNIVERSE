import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '../../../utils/prisma';

export async function GET(request) {
  try {
    // Получаем URL-параметры
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      console.error('Отсутствует параметр userId');
      return NextResponse.json({ 
        error: 'Требуется ID пользователя',
        success: false
      }, { status: 400 });
    }
    
    // Получаем токен доступа из cookies
    const cookieStore = cookies();
    const accessToken = cookieStore.get('twitch_access_token')?.value;
    
    if (!accessToken) {
      console.error('Отсутствует токен доступа');
      return NextResponse.json({ 
        error: 'Не авторизован',
        success: false
      }, { status: 401 });
    }
    
    // Получаем TWITCH_CLIENT_ID из переменных окружения
    const TWITCH_CLIENT_ID = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
    
    if (!TWITCH_CLIENT_ID) {
      console.error('TWITCH_CLIENT_ID отсутствует в переменных окружения');
      return NextResponse.json({ 
        error: 'Ошибка конфигурации сервера',
        success: false
      }, { status: 500 });
    }
    
    console.log('Выполняем принудительное обновление данных о фолловерах для пользователя:', userId);
    
    // Создаем таймаут для запроса
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-секундный таймаут
    
    try {
      // Очищаем кэш перед новым запросом
      const cacheControl = 'no-cache, no-store, must-revalidate';
      
      // Используем эндпоинт API Twitch с запретом кэширования
      const response = await fetch(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${userId}&first=100`, {
        headers: {
          'Client-ID': TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`,
          'Cache-Control': cacheControl,
          'Pragma': 'no-cache'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Ошибка при получении фолловеров: ${response.status}`, errorText);
        
        return NextResponse.json({ 
          error: 'Ошибка при получении фолловеров',
          status: response.status,
          details: errorText,
          success: false
        }, { status: 200 });
      }
      
      const data = await response.json();
      console.log('Получены обновленные данные о фолловерах:', {
        total: data.total,
        count: data.data?.length || 0
      });
      
      // Собираем ID пользователей для получения детальной информации
      const userIds = data.data?.map(follower => follower.user_id) || [];
      
      // Получаем детальную информацию о пользователях
      let usersInfo = [];
      if (userIds.length > 0) {
        const usersResponse = await fetchUsersDetails(userIds, accessToken, TWITCH_CLIENT_ID);
        usersInfo = usersResponse;
      }
      
      // Получаем список пользователей Streamers Universe с Twitch ID
      let registeredUsers = [];
      if (userIds.length > 0) {
        try {
          registeredUsers = await getRegisteredUsers(userIds);
        } catch (dbError) {
          console.error('Ошибка при получении зарегистрированных пользователей:', dbError);
        }
      }
      
      // Объединяем информацию о фолловерах с их деталями
      const followers = data.data?.map(follower => {
        const userInfo = usersInfo.find(user => user.id === follower.user_id) || {};
        const isRegistered = registeredUsers.some(ru => ru.twitchId === follower.user_id);
        const userType = registeredUsers.find(ru => ru.twitchId === follower.user_id)?.userType || 'viewer';
        
        return {
          id: follower.user_id,
          name: follower.user_name || follower.user_login,
          login: follower.user_login,
          followedAt: follower.followed_at,
          profileImageUrl: userInfo.profile_image_url || '',
          broadcasterType: userInfo.broadcaster_type || '',
          isRegisteredOnSU: isRegistered,
          suUserType: userType
        };
      }) || [];
      
      return NextResponse.json({
        success: true,
        total: data.total || 0,
        followers: followers,
        timestamp: Date.now()
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('Запрос к Twitch API превысил время ожидания');
        return NextResponse.json({ 
          error: 'Таймаут запроса к Twitch API',
          success: false
        }, { status: 200 });
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error('Ошибка при обработке запроса на обновление фолловеров:', error);
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера',
      success: false
    }, { status: 200 });
  }
}

// Функция для получения подробной информации о пользователях
async function fetchUsersDetails(userIds, accessToken, clientId) {
  if (!userIds || userIds.length === 0) {
    return [];
  }
  
  try {
    // Ограничиваем количество запрашиваемых пользователей до 100
    const limitedIds = userIds.slice(0, 100);
    
    // Формируем запрос с параметрами id для каждого пользователя
    const queryParams = limitedIds.map(id => `id=${id}`).join('&');
    const response = await fetch(`https://api.twitch.tv/helix/users?${queryParams}`, {
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      console.error('Ошибка при получении данных пользователей:', response.status);
      return [];
    }
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Ошибка при получении данных пользователей:', error);
    return [];
  }
}

// Функция для проверки, зарегистрированы ли пользователи на Streamers Universe
async function getRegisteredUsers(twitchIds) {
  if (!twitchIds || twitchIds.length === 0) {
    return [];
  }
  
  try {
    // Используем Prisma для проверки регистрации пользователей
    const users = await prisma.users.findMany({
      where: {
        twitchId: {
          in: twitchIds
        }
      },
      select: {
        id: true,
        twitchId: true,
        username: true,
        userType: true
      }
    });
    
    return users;
  } catch (error) {
    console.error('Ошибка при проверке регистрации пользователей:', error);
    return [];
  }
} 