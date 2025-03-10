import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  // Получаем параметры запроса
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json(
      { error: 'User ID is required' },
      { status: 400 }
    );
  }
  
  // Получаем токен доступа из cookies
  const cookieStore = cookies();
  const accessToken = cookieStore.get('twitch_access_token')?.value;
  
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Not authenticated', followings: [] },
      { status: 401 }
    );
  }
  
  try {
    // Проверяем наличие Client ID
    if (!process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID) {
      console.error('TWITCH_CLIENT_ID не найден в переменных окружения');
      return NextResponse.json(
        { error: 'Server configuration error', followings: [] },
        { status: 500 }
      );
    }
    
    // Получаем список пользователей, на которых подписан текущий пользователь
    const twitchFollowingsResponse = await fetch(
      `https://api.twitch.tv/helix/users/follows?from_id=${userId}&first=100`,
      {
        headers: {
          'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    if (!twitchFollowingsResponse.ok) {
      console.error(`Ошибка при получении фолловингов с Twitch API: ${twitchFollowingsResponse.status}`);
      return NextResponse.json(
        { error: 'Failed to fetch user followings from Twitch API', followings: [] },
        { status: twitchFollowingsResponse.status }
      );
    }
    
    const twitchFollowingsData = await twitchFollowingsResponse.json();
    
    if (!twitchFollowingsData.data || twitchFollowingsData.data.length === 0) {
      return NextResponse.json({ followings: [] });
    }
    
    // Получаем ID пользователей для запроса подробной информации
    const followingIds = twitchFollowingsData.data.map(following => following.to_id);
    
    // Получаем подробную информацию о пользователях
    const userDetailsResponse = await fetch(
      `https://api.twitch.tv/helix/users?id=${followingIds.join('&id=')}`,
      {
        headers: {
          'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    if (!userDetailsResponse.ok) {
      console.error(`Ошибка при получении данных пользователей с Twitch API: ${userDetailsResponse.status}`);
      // Возвращаем базовую информацию без деталей
      const basicFollowings = twitchFollowingsData.data.map(following => ({
        id: following.to_id,
        display_name: following.to_name,
        login: following.to_name.toLowerCase(),
        followed_at: following.followed_at
      }));
      
      return NextResponse.json({ followings: basicFollowings });
    }
    
    const userDetailsData = await userDetailsResponse.json();
    
    // Объединяем данные из обоих запросов
    const followings = userDetailsData.data.map(user => {
      const followData = twitchFollowingsData.data.find(follow => follow.to_id === user.id);
      return {
        ...user,
        followed_at: followData?.followed_at
      };
    });
    
    // Проверяем, какие пользователи зарегистрированы в Streamers Universe
    // В реальном приложении здесь будет запрос к базе данных
    // Для демо, определяем по наличию cookie с подпиской
    const registeredUsers = followings.map(following => {
      // Проверяем, есть ли cookie для подписки на этого пользователя
      const isRegistered = followings.length > 0 && Math.random() > 0.5; // Для демо, рандомно определяем
      
      return {
        ...following,
        isRegisteredInSU: isRegistered
      };
    });
    
    return NextResponse.json({ followings: registeredUsers });
  } catch (error) {
    console.error('Error fetching user followings:', error);
    return NextResponse.json(
      { error: 'Server error', message: error.message, followings: [] },
      { status: 500 }
    );
  }
} 