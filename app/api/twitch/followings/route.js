import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    // Получаем URL-параметры
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      console.error('Отсутствует параметр userId');
      return NextResponse.json({ error: 'Требуется ID пользователя' }, { status: 400 });
    }
    
    // Получаем токен доступа из cookies
    const cookieStore = cookies();
    const accessToken = cookieStore.get('twitch_access_token')?.value;
    
    if (!accessToken) {
      console.error('Отсутствует токен доступа');
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }
    
    // Получаем TWITCH_CLIENT_ID из переменных окружения
    const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
    
    if (!TWITCH_CLIENT_ID) {
      console.error('TWITCH_CLIENT_ID отсутствует в переменных окружения');
      return NextResponse.json({ error: 'Ошибка конфигурации сервера' }, { status: 500 });
    }
    
    console.log('Выполняем запрос к Twitch API для получения фолловингов пользователя:', userId);
    
    // Выполняем запрос к Twitch API для получения фолловингов пользователя (кого пользователь фолловит)
    const response = await fetch(`https://api.twitch.tv/helix/users/follows?from_id=${userId}&first=100`, {
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Ошибка при получении фолловингов: ${response.status}`, errorText);
      return NextResponse.json({ 
        error: 'Ошибка при получении фолловингов', 
        status: response.status,
        details: errorText
      }, { status: response.status });
    }
    
    const data = await response.json();
    console.log('Получены данные о фолловингах:', {
      total: data.total,
      count: data.data?.length || 0
    });
    
    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      return NextResponse.json({
        total: data.total || 0,
        followings: []
      });
    }
    
    // Получаем ID пользователей, на которых подписан
    const followingIds = data.data.map(follow => follow.to_id);
    
    // Получаем детальную информацию о пользователях
    const usersResponse = await fetch(`https://api.twitch.tv/helix/users?id=${followingIds.join('&id=')}`, {
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!usersResponse.ok) {
      console.error(`Ошибка при получении данных пользователей: ${usersResponse.status}`);
      
      // Даже если не получилось получить детальную информацию, возвращаем базовые данные
      const basicFollowings = data.data.map(following => ({
        id: following.to_id,
        name: following.to_name,
        followedAt: following.followed_at
      }));
      
      return NextResponse.json({
        total: data.total,
        followings: basicFollowings,
        warning: 'Не удалось получить детальную информацию о пользователях'
      });
    }
    
    const usersData = await usersResponse.json();
    
    // Объединяем данные о фолловингах с данными о пользователях
    const followings = data.data.map(following => {
      const userData = usersData.data.find(user => user.id === following.to_id);
      
      return {
        id: following.to_id,
        name: userData?.display_name || following.to_name,
        login: userData?.login || '',
        profileImageUrl: userData?.profile_image_url || '',
        broadcasterType: userData?.broadcaster_type || '',
        followedAt: following.followed_at
      };
    });
    
    return NextResponse.json({
      total: data.total,
      followings: followings
    });
  } catch (error) {
    console.error('Ошибка при обработке запроса:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
} 