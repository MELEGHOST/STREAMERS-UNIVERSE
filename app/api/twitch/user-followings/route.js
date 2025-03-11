import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  // Добавляем таймаут для предотвращения зависания
  const TIMEOUT = 15000; // 15 секунд
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('API Timeout')), TIMEOUT);
  });
  
  // Получаем параметры запроса
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json(
      { error: 'User ID is required' },
      { status: 400 }
    );
  }
  
  // Получаем токен из различных источников
  const cookieStore = cookies();
  let accessToken = cookieStore.get('twitch_access_token')?.value;
  
  // Проверяем заголовок Authorization
  const authHeader = request.headers.get('authorization');
  if (!accessToken && authHeader && authHeader.startsWith('Bearer ')) {
    accessToken = authHeader.substring(7);
  }
  
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Not authenticated', followings: [] },
      { status: 401 }
    );
  }
  
  try {
    // Проверяем наличие Client ID
    const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
    if (!clientId) {
      console.error('TWITCH_CLIENT_ID не найден в переменных окружения');
      return NextResponse.json(
        { error: 'Server configuration error', followings: [] },
        { status: 500 }
      );
    }
    
    // Создаем промис для получения фолловингов
    const fetchFollowingsPromise = async () => {
      // Получаем список пользователей, на которых подписан текущий пользователь
      const twitchFollowingsResponse = await fetch(
        `https://api.twitch.tv/helix/users/follows?from_id=${userId}&first=100`,
        {
          headers: {
            'Client-ID': clientId,
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      
      if (!twitchFollowingsResponse.ok) {
        console.error(`Ошибка при получении фолловингов с Twitch API: ${twitchFollowingsResponse.status}`);
        throw new Error(`Twitch API error: ${twitchFollowingsResponse.status}`);
      }
      
      const twitchFollowingsData = await twitchFollowingsResponse.json();
      
      if (!twitchFollowingsData.data || twitchFollowingsData.data.length === 0) {
        return { followings: [] };
      }
      
      // Формируем простой ответ без дополнительных запросов для ускорения
      const simpleFollowings = twitchFollowingsData.data.map(following => ({
        id: following.to_id,
        display_name: following.to_name,
        login: following.to_login,
        followed_at: following.followed_at,
        // Заглушки для предотвращения ошибок на фронтенде
        profile_image_url: `https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517fe-def4-11e9-948e-784f43822e80-profile_image-300x300.png`,
        isRegisteredInSU: false
      }));
      
      return { followings: simpleFollowings };
    };
    
    // Используем Promise.race для установки таймаута
    const result = await Promise.race([fetchFollowingsPromise(), timeoutPromise]);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching user followings:', error);
    
    // Возвращаем пустой список при любой ошибке
    return NextResponse.json({ followings: [] });
  }
} 