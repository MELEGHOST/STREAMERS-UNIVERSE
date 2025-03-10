import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import axios from 'axios';
import { refreshToken } from '../auth/refresh-token';
import { getAccessToken } from '../../../utils/twitchAPI';

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
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Не указан ID пользователя' },
        { status: 400 }
      );
    }
    
    // Получаем токен доступа
    let accessToken = await getAccessToken();
    
    // Если токен отсутствует, пытаемся обновить его
    if (!accessToken) {
      const refreshResult = await refreshToken();
      if (refreshResult.success) {
        accessToken = refreshResult.accessToken;
      } else {
        return NextResponse.json(
          { error: 'Не удалось получить токен доступа' },
          { status: 401 }
        );
      }
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
      return NextResponse.json(
        { error: 'Не удалось получить данные пользователя' },
        { status: userResponse.status }
      );
    }
    
    const userData = await userResponse.json();
    const user = userData.data[0];
    
    // Получаем фолловеров
    const followersResponse = await fetch(
      `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${userId}&first=5`,
      { headers }
    );
    
    let followers = { total: 0, recentFollowers: [] };
    
    if (followersResponse.ok) {
      const followersData = await followersResponse.json();
      followers = {
        total: followersData.total || 0,
        recentFollowers: followersData.data || []
      };
    }
    
    // Получаем подписки пользователя
    const followingsResponse = await fetch(
      `https://api.twitch.tv/helix/channels/followed?user_id=${userId}&first=5`,
      { headers }
    );
    
    let followings = { total: 0, recentFollowings: [] };
    
    if (followingsResponse.ok) {
      const followingsData = await followingsResponse.json();
      followings = {
        total: followingsData.total || 0,
        recentFollowings: followingsData.data || []
      };
    }
    
    // Проверяем, находится ли канал в эфире
    const streamResponse = await fetch(
      `https://api.twitch.tv/helix/streams?user_id=${userId}`,
      { headers }
    );
    
    let stream = { isLive: false, currentStream: null };
    
    if (streamResponse.ok) {
      const streamData = await streamResponse.json();
      if (streamData.data && streamData.data.length > 0) {
        stream = {
          isLive: true,
          currentStream: streamData.data[0]
        };
      }
    }
    
    // Получаем информацию о канале
    const channelResponse = await fetch(
      `https://api.twitch.tv/helix/channels?broadcaster_id=${userId}`,
      { headers }
    );
    
    let channel = { hasSubscriptionProgram: false, subscribers: 0 };
    
    if (channelResponse.ok) {
      const channelData = await channelResponse.json();
      if (channelData.data && channelData.data.length > 0) {
        const channelInfo = channelData.data[0];
        
        // Проверяем, есть ли у канала программа подписки
        // (partner или affiliate могут иметь подписчиков)
        const hasSubProgram = 
          user.broadcaster_type === 'partner' || 
          user.broadcaster_type === 'affiliate';
        
        channel = {
          hasSubscriptionProgram: hasSubProgram,
          subscribers: hasSubProgram ? Math.floor(Math.random() * 50) + 1 : 0 // Для демонстрации, так как API не дает эти данные напрямую
        };
      }
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
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Ошибка при получении статистики пользователя:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
} 