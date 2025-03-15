import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    // Получаем refresh_token из тела запроса
    const body = await request.json();
    const { refresh_token } = body;
    
    if (!refresh_token) {
      return NextResponse.json(
        { error: 'Отсутствует refresh_token' },
        { status: 400 }
      );
    }
    
    // Получаем настройки Twitch API из переменных окружения
    const clientId = process.env.TWITCH_CLIENT_ID || process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Отсутствуют настройки Twitch API' },
        { status: 500 }
      );
    }
    
    // Обмениваем refresh_token на новый access_token
    const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Ошибка при обновлении токена доступа:', errorData);
      
      // Если токен недействителен, удаляем все связанные куки
      if (tokenResponse.status === 400 || tokenResponse.status === 401) {
        cookies().delete('twitch_access_token');
        cookies().delete('twitch_refresh_token');
        
        return NextResponse.json(
          { error: 'Недействительный refresh_token', invalidToken: true },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: 'Ошибка при обновлении токена доступа' },
        { status: tokenResponse.status }
      );
    }
    
    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token: new_refresh_token } = tokenData;
    
    // Устанавливаем новые куки
    const cookieStore = cookies();
    
    // Устанавливаем новый токен доступа
    cookieStore.set('twitch_access_token', access_token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 дней
    });
    
    // Если получен новый refresh_token, устанавливаем и его
    if (new_refresh_token) {
      cookieStore.set('twitch_refresh_token', new_refresh_token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 дней
      });
    }
    
    // Возвращаем новые токены клиенту
    return NextResponse.json({
      access_token,
      refresh_token: new_refresh_token || refresh_token,
    });
  } catch (error) {
    console.error('Ошибка при обработке запроса на обновление токена:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
} 