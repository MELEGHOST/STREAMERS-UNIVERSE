import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getOrCreateUser, createToken } from '@/app/lib/auth';

/**
 * Обработчик GET запроса для обработки обратного вызова от Twitch
 */
export async function GET(request) {
  try {
    // Получаем параметры из URL
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    // Проверяем наличие ошибок
    if (error) {
      console.error(`Ошибка авторизации Twitch: ${error} - ${errorDescription}`);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth?error=${error}`);
    }
    
    // Проверяем наличие кода авторизации
    if (!code) {
      console.error('Отсутствует код авторизации в ответе Twitch');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth?error=no_code`);
    }
    
    // Получаем настройки Twitch API из переменных окружения
    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    const redirectUri = process.env.TWITCH_REDIRECT_URI;
    
    if (!clientId || !clientSecret || !redirectUri) {
      console.error('Отсутствуют настройки Twitch API');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth?error=config_error`);
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
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth?error=token_error`);
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
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth?error=user_error`);
    }
    
    const userData = await userResponse.json();
    const twitchUser = userData.data[0];
    
    // Получаем или создаем пользователя в базе данных
    const user = await getOrCreateUser(twitchUser);
    
    // Создаем JWT токен
    const token = await createToken(user);
    
    // Устанавливаем куки
    const cookieStore = cookies();
    
    // Устанавливаем токен доступа
    cookieStore.set('twitch_access_token', access_token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 дней
    });
    
    // Устанавливаем токен обновления
    cookieStore.set('twitch_refresh_token', refresh_token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 дней
    });
    
    // Устанавливаем JWT токен
    cookieStore.set('twitch_token', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 дней
    });
    
    // Устанавливаем данные пользователя
    cookieStore.set('twitch_user', JSON.stringify({
      id: user.id,
      twitchId: user.twitchId,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
    }), {
      path: '/',
      httpOnly: false, // Доступно для JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 дней
    });
    
    // Перенаправляем пользователя на главную страницу
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/menu`);
  } catch (error) {
    console.error('Ошибка при обработке обратного вызова от Twitch:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth?error=server_error`);
  }
} 