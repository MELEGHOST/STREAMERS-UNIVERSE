import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { DataStorage } from '../../../utils/dataStorage';
import { sanitizeObject } from '@/utils/securityUtils';

// Получаем токен доступа из cookie
function getAccessTokenFromCookie() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('twitch_access_token')?.value;
    return token || null;
  } catch (error) {
    console.error('Ошибка при получении токена доступа из cookie:', error);
    return null;
  }
}

export async function GET(request) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Не указан ID пользователя' },
        { status: 400 }
      );
    }
    
    // Получаем токен доступа из cookie
    let accessToken = getAccessTokenFromCookie();
    
    // Если токен не найден, возвращаем ошибку
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Не авторизован', message: 'Токен доступа не найден. Пожалуйста, войдите снова.' },
        { status: 401 }
      );
    }
    
    // Заголовки для запросов к Twitch API
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Client-Id': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID
    };
    
    // Получаем данные пользователя
    const userResponse = await fetch(
      `https://api.twitch.tv/helix/users?id=${userId}`,
      { headers }
    );
    
    if (!userResponse.ok) {
      // Если получили ошибку 401, возможно, токен устарел
      if (userResponse.status === 401) {
        return NextResponse.json(
          { error: 'Срок действия токена истек', message: 'Пожалуйста, войдите снова.' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: 'Не удалось получить данные пользователя' },
        { status: userResponse.status }
      );
    }
    
    const userData = await userResponse.json();
    
    if (!userData.data || userData.data.length === 0) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }
    
    const user = userData.data[0];
    
    // Получаем фолловеров
    let followers = { total: 0, recentFollowers: [] };
    try {
      const followersResponse = await fetch(
        `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${userId}&first=5`,
        { headers }
      );
      
      if (followersResponse.ok) {
        const followersData = await followersResponse.json();
        followers = {
          total: followersData.total || 0,
          recentFollowers: followersData.data || []
        };
      }
    } catch (error) {
      console.error('Ошибка при получении фолловеров:', error);
    }
    
    // Получаем подписки пользователя
    let followings = { total: 0, recentFollowings: [] };
    try {
      const followingsResponse = await fetch(
        `https://api.twitch.tv/helix/channels/followed?user_id=${userId}&first=5`,
        { headers }
      );
      
      if (followingsResponse.ok) {
        const followingsData = await followingsResponse.json();
        followings = {
          total: followingsData.total || 0,
          recentFollowings: followingsData.data || []
        };
      }
    } catch (error) {
      console.error('Ошибка при получении фолловингов:', error);
    }
    
    // Проверяем, находится ли канал в эфире
    let stream = { isLive: false, currentStream: null };
    try {
      const streamResponse = await fetch(
        `https://api.twitch.tv/helix/streams?user_id=${userId}`,
        { headers }
      );
      
      if (streamResponse.ok) {
        const streamData = await streamResponse.json();
        if (streamData.data && streamData.data.length > 0) {
          stream = {
            isLive: true,
            currentStream: streamData.data[0]
          };
        }
      }
    } catch (error) {
      console.error('Ошибка при проверке состояния стрима:', error);
    }
    
    // Получаем информацию о канале
    let channel = { hasSubscriptionProgram: false, subscribers: 0 };
    try {
      const channelResponse = await fetch(
        `https://api.twitch.tv/helix/channels?broadcaster_id=${userId}`,
        { headers }
      );
      
      if (channelResponse.ok) {
        const channelData = await channelResponse.json();
        if (channelData.data && channelData.data.length > 0) {
          // Проверяем, есть ли у канала программа подписки
          const hasSubProgram = 
            user.broadcaster_type === 'partner' || 
            user.broadcaster_type === 'affiliate';
          
          channel = {
            hasSubscriptionProgram: hasSubProgram,
            subscribers: hasSubProgram ? 15 : 0 // Для демонстрации
          };
        }
      }
    } catch (error) {
      console.error('Ошибка при получении информации о канале:', error);
    }
    
    // Составляем полный ответ
    const response = {
      user: {
        id: user.id,
        login: user.login,
        displayName: user.display_name,
        viewCount: user.view_count,
        createdAt: user.created_at,
        broadcasterType: user.broadcaster_type
      },
      followers,
      followings,
      stream,
      channel
    };
    
    // Сохраняем в кэш для быстрого доступа в будущем
    try {
      await DataStorage.saveData('user_stats', {
        ...response,
        timestamp: Date.now()
      });
    } catch (e) {
      console.warn('Не удалось сохранить статистику в кэш:', e);
    }
    
    return NextResponse.json(sanitizeObject(response));
  } catch (error) {
    console.error('Ошибка при получении статистики пользователя:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
} 