import { NextResponse } from 'next/server';

/**
 * Обработчик GET запроса для обмена кода авторизации на токен доступа
 */
export async function GET(request) {
  try {
    // Получаем код авторизации из URL
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    
    // Проверяем наличие кода авторизации
    if (!code) {
      console.error('Отсутствует код авторизации');
      return NextResponse.json(
        { error: 'Отсутствует код авторизации' },
        { status: 400 }
      );
    }
    
    // Получаем настройки Twitch API из переменных окружения
    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    const redirectUri = process.env.TWITCH_REDIRECT_URI;
    
    if (!clientId || !clientSecret || !redirectUri) {
      console.error('Отсутствуют настройки Twitch API');
      return NextResponse.json(
        { error: 'Отсутствуют настройки Twitch API' },
        { status: 500 }
      );
    }
    
    // Обмениваем код авторизации на токен доступа
    const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Ошибка при получении токена доступа:', errorData);
      return NextResponse.json(
        { error: 'Ошибка при получении токена доступа', details: errorData },
        { status: tokenResponse.status }
      );
    }
    
    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token } = tokenData;
    
    // Получаем данные пользователя из Twitch API
    const userResponse = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Client-Id': clientId,
      },
    });
    
    if (!userResponse.ok) {
      const errorData = await userResponse.json();
      console.error('Ошибка при получении данных пользователя:', errorData);
      return NextResponse.json(
        { error: 'Ошибка при получении данных пользователя', details: errorData },
        { status: userResponse.status }
      );
    }
    
    const userData = await userResponse.json();
    const twitchUser = userData.data[0];
    
    // Возвращаем токен доступа и данные пользователя
    return NextResponse.json({
      accessToken: access_token,
      refreshToken: refresh_token,
      userData: twitchUser
    });
  } catch (error) {
    console.error('Ошибка при обработке запроса на получение токена:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
} 