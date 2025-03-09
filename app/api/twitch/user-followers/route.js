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
    
    console.log('Выполняем запрос к Twitch API для получения фолловеров пользователя:', userId);
    console.log('Используемые заголовки:', {
      'Client-ID': TWITCH_CLIENT_ID.substring(0, 5) + '...',
      'Authorization': 'Bearer ' + accessToken.substring(0, 5) + '...'
    });
    
    // Выполняем запрос к Twitch API для получения фолловеров пользователя
    const response = await fetch(`https://api.twitch.tv/helix/users/follows?to_id=${userId}&first=100`, {
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Ошибка при получении фолловеров: ${response.status}`, errorText);
      return NextResponse.json({ 
        error: 'Ошибка при получении фолловеров', 
        status: response.status,
        details: errorText
      }, { status: response.status });
    }
    
    const data = await response.json();
    console.log('Получены данные о фолловерах:', {
      total: data.total,
      count: data.data?.length || 0
    });
    
    // Форматируем данные о фолловерах
    const followers = data.data.map(follower => ({
      id: follower.from_id,
      name: follower.from_name,
      followedAt: follower.followed_at
    }));
    
    return NextResponse.json({
      total: data.total,
      followers: followers
    });
  } catch (error) {
    console.error('Ошибка при обработке запроса:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
} 