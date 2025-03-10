import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    // Получаем ID пользователей SU из запроса
    const { suFollowerIds, userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'Требуется ID стримера для проверки фолловеров',
        followerIds: []
      }, { status: 400 });
    }
    
    if (!suFollowerIds || !Array.isArray(suFollowerIds) || suFollowerIds.length === 0) {
      return NextResponse.json({
        error: 'Требуется массив ID пользователей SU',
        followerIds: []
      }, { status: 400 });
    }
    
    // Получаем токен доступа из cookies
    const cookieStore = cookies();
    const accessToken = cookieStore.get('twitch_access_token')?.value;
    
    if (!accessToken) {
      console.error('Отсутствует токен доступа');
      return NextResponse.json({ 
        error: 'Не авторизован',
        followerIds: []
      }, { status: 401 });
    }
    
    // Получаем TWITCH_CLIENT_ID из переменных окружения
    const TWITCH_CLIENT_ID = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
    
    if (!TWITCH_CLIENT_ID) {
      console.error('TWITCH_CLIENT_ID отсутствует в переменных окружения');
      return NextResponse.json({ 
        error: 'Ошибка конфигурации сервера',
        followerIds: []
      }, { status: 500 });
    }
    
    // Получаем всех фолловеров пользователя с Twitch
    const followersResponse = await fetch(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${userId}&first=100`, {
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!followersResponse.ok) {
      const errorText = await followersResponse.text();
      console.error(`Ошибка при получении фолловеров: ${followersResponse.status}`, errorText);
      
      return NextResponse.json({ 
        error: `Ошибка при получении фолловеров: ${followersResponse.status}`,
        followerIds: [] 
      }, { status: followersResponse.status });
    }
    
    const followersData = await followersResponse.json();
    
    if (!followersData.data || !Array.isArray(followersData.data)) {
      return NextResponse.json({
        followerIds: []
      });
    }
    
    // Получаем ID всех фолловеров
    const followerIds = followersData.data.map(follower => follower.user_id);
    
    // Фильтруем только те ID, которые есть в списке suFollowerIds
    const matchingFollowerIds = suFollowerIds.filter(id => followerIds.includes(id));
    
    return NextResponse.json({
      followerIds: matchingFollowerIds
    });
  } catch (error) {
    console.error('Ошибка при проверке фолловеров:', error);
    
    return NextResponse.json({
      error: 'Ошибка при проверке фолловеров',
      followerIds: []
    }, { status: 500 });
  }
} 