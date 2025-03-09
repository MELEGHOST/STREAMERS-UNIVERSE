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
    
    // Выполняем запрос к Twitch API для получения подписок пользователя (фолловингов)
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
    
    // Получаем дополнительные данные о каналах, на которые подписан пользователь
    const userIds = data.data.map(following => following.to_id).join('&id=');
    
    if (userIds) {
      const usersResponse = await fetch(`https://api.twitch.tv/helix/users?id=${userIds}`, {
        headers: {
          'Client-ID': TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        
        // Создаем словарь пользователей по ID
        const usersById = {};
        usersData.data.forEach(user => {
          usersById[user.id] = user;
        });
        
        // Форматируем данные о фолловингах и добавляем информацию о пользователях
        const followings = data.data.map(following => ({
          id: following.to_id,
          name: following.to_name,
          login: usersById[following.to_id]?.login || '',
          profileImageUrl: usersById[following.to_id]?.profile_image_url || '',
          followedAt: following.followed_at
        }));
        
        return NextResponse.json({
          total: data.total,
          followings: followings
        });
      }
    }
    
    // Если не удалось получить дополнительные данные о пользователях,
    // возвращаем базовую информацию о фолловингах
    const followings = data.data.map(following => ({
      id: following.to_id,
      name: following.to_name,
      followedAt: following.followed_at
    }));
    
    return NextResponse.json({
      total: data.total,
      followings: followings
    });
  } catch (error) {
    console.error('Ошибка при обработке запроса:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
} 