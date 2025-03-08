import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Не указан ID пользователя' }, { status: 400 });
    }
    
    // Получаем токен доступа из cookies
    const cookieStore = cookies();
    const accessTokenCookie = cookieStore.get('twitch_token');
    
    if (!accessTokenCookie) {
      return NextResponse.json({ error: 'Не найден токен доступа' }, { status: 401 });
    }
    
    const accessToken = accessTokenCookie.value;
    
    // Получаем данные пользователя из Twitch API
    const twitchResponse = await fetch(`https://api.twitch.tv/helix/users?id=${userId}`, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!twitchResponse.ok) {
      if (twitchResponse.status === 401) {
        return NextResponse.json({ error: 'Токен доступа истек' }, { status: 401 });
      }
      return NextResponse.json({ error: 'Ошибка при получении данных пользователя' }, { status: twitchResponse.status });
    }
    
    const twitchData = await twitchResponse.json();
    
    if (!twitchData.data || twitchData.data.length === 0) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }
    
    const userData = twitchData.data[0];
    
    // Получаем количество фолловеров пользователя
    const followersResponse = await fetch(`https://api.twitch.tv/helix/users/follows?to_id=${userId}`, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (followersResponse.ok) {
      const followersData = await followersResponse.json();
      userData.follower_count = followersData.total || 0;
    }
    
    // Получаем количество фолловингов пользователя
    const followingResponse = await fetch(`https://api.twitch.tv/helix/users/follows?from_id=${userId}`, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (followingResponse.ok) {
      const followingData = await followingResponse.json();
      userData.following_count = followingData.total || 0;
    }
    
    return NextResponse.json(userData);
  } catch (error) {
    console.error('Ошибка при получении данных пользователя:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
} 