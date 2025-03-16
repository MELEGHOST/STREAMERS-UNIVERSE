import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import axios from 'axios';

export async function GET(request) {
  try {
    // Получаем userId из параметров запроса
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Отсутствует userId', success: false },
        { status: 400 }
      );
    }
    
    // Получаем токен доступа из cookies или заголовка Authorization
    const cookieStore = cookies();
    let accessToken = cookieStore.get('twitch_access_token')?.value;
    
    if (!accessToken) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7);
      }
    }
    
    // Проверяем, что токен существует
    if (!accessToken) {
      return NextResponse.json({ 
        error: 'Не авторизован', 
        message: 'Токен доступа не найден или недействителен. Пожалуйста, войдите снова.',
        success: false
      }, { status: 401 });
    }
    
    // Получаем данные о фолловерах из Twitch API
    const response = await axios.get(`https://api.twitch.tv/helix/users/follows?to_id=${userId}&first=100`, {
      headers: {
        'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    // Проверяем, что получили данные
    if (!response.data || !response.data.data) {
      return NextResponse.json({ 
        error: 'Ошибка при получении данных о фолловерах', 
        success: false 
      }, { status: 500 });
    }
    
    // Форматируем данные для клиента
    const followers = response.data.data.map(follower => ({
      id: follower.from_id,
      login: follower.from_login,
      name: follower.from_name,
      followedAt: follower.followed_at,
      // Дополнительные поля можно получить через отдельный запрос к API
    }));
    
    // Возвращаем данные
    return NextResponse.json({
      success: true,
      followers,
      total: response.data.total || followers.length,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Ошибка при обновлении фолловеров:', error);
    
    // Проверяем, не истек ли токен
    if (error.response && error.response.status === 401) {
      return NextResponse.json({ 
        error: 'Токен недействителен', 
        message: 'Срок действия токена истек или он был отозван. Пожалуйста, войдите снова.',
        success: false
      }, { status: 401 });
    }
    
    return NextResponse.json({ 
      error: 'Ошибка сервера', 
      message: error.message || 'Произошла неизвестная ошибка. Пожалуйста, попробуйте позже.',
      success: false
    }, { status: 500 });
  }
} 