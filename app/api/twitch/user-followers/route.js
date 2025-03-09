import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    // Получаем URL-параметры
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      console.error('Отсутствует параметр userId');
      return NextResponse.json({ 
        error: 'Требуется ID пользователя',
        total: 0,
        followers: []
      }, { status: 400 });
    }
    
    // Получаем токен доступа из cookies
    const cookieStore = cookies();
    const accessToken = cookieStore.get('twitch_access_token')?.value;
    
    if (!accessToken) {
      console.error('Отсутствует токен доступа');
      return NextResponse.json({ 
        error: 'Не авторизован',
        total: 0,
        followers: []
      }, { status: 401 });
    }
    
    // Получаем TWITCH_CLIENT_ID из переменных окружения
    const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
    
    if (!TWITCH_CLIENT_ID) {
      console.error('TWITCH_CLIENT_ID отсутствует в переменных окружения');
      return NextResponse.json({ 
        error: 'Ошибка конфигурации сервера',
        total: 0, 
        followers: []
      }, { status: 500 });
    }
    
    console.log('Выполняем запрос к Twitch API для получения фолловеров пользователя:', userId);
    console.log('Используемые заголовки:', {
      'Client-ID': TWITCH_CLIENT_ID.substring(0, 5) + '...',
      'Authorization': 'Bearer ' + accessToken.substring(0, 5) + '...'
    });
    
    // Создаем таймаут для запроса
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-секундный таймаут
    
    try {
      // Выполняем запрос к Twitch API для получения фолловеров пользователя
      const response = await fetch(`https://api.twitch.tv/helix/users/follows?to_id=${userId}&first=100`, {
        headers: {
          'Client-ID': TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Ошибка при получении фолловеров: ${response.status}`, errorText);
        
        // Возвращаем пустой результат с кодом ошибки, вместо ошибки 500
        return NextResponse.json({ 
          error: 'Ошибка при получении фолловеров',
          status: response.status,
          details: errorText,
          total: 0,
          followers: []
        }, { status: 200 }); // Отправляем 200 вместо ошибки для предотвращения краша клиента
      }
      
      const data = await response.json();
      console.log('Получены данные о фолловерах:', {
        total: data.total,
        count: data.data?.length || 0
      });
      
      // Если данных нет, возвращаем пустой массив
      if (!data.data || !Array.isArray(data.data)) {
        return NextResponse.json({
          total: data.total || 0,
          followers: []
        });
      }
      
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
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('Запрос к Twitch API превысил время ожидания');
        return NextResponse.json({ 
          error: 'Таймаут запроса к Twitch API',
          total: 0,
          followers: []
        }, { status: 200 }); // Отправляем 200 вместо ошибки
      }
      
      throw fetchError; // Передаем ошибку дальше для обработки на верхнем уровне
    }
  } catch (error) {
    console.error('Ошибка при обработке запроса:', error);
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера',
      total: 0,
      followers: []
    }, { status: 200 }); // Отправляем 200 вместо ошибки 500
  }
} 