import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    console.log('Начало процесса обновления токена доступа');
    
    // Получаем refresh_token из тела запроса
    const body = await request.json();
    const { refresh_token } = body;
    
    if (!refresh_token) {
      console.error('Отсутствует refresh_token в запросе');
      return NextResponse.json(
        { error: 'Отсутствует refresh_token' },
        { status: 400 }
      );
    }
    
    // Получаем настройки Twitch API из переменных окружения
    const clientId = process.env.TWITCH_CLIENT_ID || process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.error('Отсутствуют настройки Twitch API в переменных окружения');
      return NextResponse.json(
        { error: 'Отсутствуют настройки Twitch API' },
        { status: 500 }
      );
    }
    
    console.log('Отправка запроса на обновление токена в Twitch API');
    
    // Устанавливаем таймаут для запроса
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-секундный таймаут
    
    try {
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
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({ message: 'Не удалось получить данные об ошибке' }));
        console.error('Ошибка при обновлении токена доступа:', errorData);
        
        // Если токен недействителен, удаляем все связанные куки
        if (tokenResponse.status === 400 || tokenResponse.status === 401) {
          console.log('Токен недействителен, удаляем куки');
          cookies().delete('twitch_access_token');
          cookies().delete('twitch_refresh_token');
          
          return NextResponse.json(
            { error: 'Недействительный refresh_token', invalidToken: true },
            { status: 401 }
          );
        }
        
        return NextResponse.json(
          { error: 'Ошибка при обновлении токена доступа', details: errorData },
          { status: tokenResponse.status }
        );
      }
      
      const tokenData = await tokenResponse.json();
      const { access_token, refresh_token: new_refresh_token, expires_in } = tokenData;
      
      console.log('Токен успешно обновлен, устанавливаем новые куки');
      
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
        expires_in
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // Обрабатываем ошибки сети или таймаута
      if (fetchError.name === 'AbortError') {
        console.error('Таймаут при обновлении токена');
        return NextResponse.json(
          { error: 'Таймаут при обновлении токена' },
          { status: 504 }
        );
      }
      
      console.error('Ошибка сети при обновлении токена:', fetchError);
      return NextResponse.json(
        { error: 'Ошибка сети при обновлении токена', details: fetchError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Необработанная ошибка при обновлении токена:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера', details: error.message },
      { status: 500 }
    );
  }
} 