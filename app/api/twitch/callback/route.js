import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    // Получаем URL и параметры запроса
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const error_description = url.searchParams.get('error_description');
    
    // Проверяем наличие ошибки от Twitch
    if (error) {
      console.error('Ошибка авторизации Twitch:', error, error_description);
      return NextResponse.redirect(new URL(`/auth?error=${encodeURIComponent(error)}&message=${encodeURIComponent(error_description || 'Ошибка авторизации')}`, request.url));
    }
    
    // Проверяем наличие кода авторизации
    if (!code) {
      console.error('Отсутствует код авторизации в ответе Twitch');
      return NextResponse.redirect(new URL('/auth?error=no_code&message=Не получен код авторизации от Twitch', request.url));
    }
    
    // Получаем состояние из куки для проверки
    const cookieStore = cookies();
    const cookieState = cookieStore.get('twitch_auth_state')?.value;
    
    // Проверяем соответствие состояния для защиты от CSRF
    if (cookieState && state !== cookieState) {
      console.error('Несоответствие состояния при авторизации Twitch');
      return NextResponse.redirect(new URL('/auth?error=state_mismatch&message=Ошибка безопасности при авторизации', request.url));
    }
    
    // Получаем параметры для обмена кода на токен
    const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    const redirectUri = process.env.NEXT_PUBLIC_TWITCH_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL}/api/twitch/callback`;
    
    // Проверяем наличие необходимых параметров
    if (!clientId || !clientSecret) {
      console.error('Отсутствуют необходимые параметры в переменных окружения');
      return NextResponse.redirect(new URL('/auth?error=config_error&message=Ошибка конфигурации сервера', request.url));
    }
    
    // Формируем запрос для обмена кода на токен
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
    
    // Проверяем успешность запроса
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error('Ошибка получения токена от Twitch:', tokenResponse.status, errorData);
      return NextResponse.redirect(new URL(`/auth?error=token_error&message=Ошибка получения токена (${tokenResponse.status})`, request.url));
    }
    
    // Получаем данные токена
    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;
    
    // Проверяем наличие токена доступа
    if (!access_token) {
      console.error('Отсутствует токен доступа в ответе Twitch');
      return NextResponse.redirect(new URL('/auth?error=no_token&message=Не получен токен доступа от Twitch', request.url));
    }
    
    // Получаем данные пользователя с использованием токена
    const userResponse = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Client-ID': clientId,
      },
    });
    
    // Проверяем успешность запроса
    if (!userResponse.ok) {
      console.error('Ошибка получения данных пользователя от Twitch:', userResponse.status);
      return NextResponse.redirect(new URL(`/auth?error=user_error&message=Ошибка получения данных пользователя (${userResponse.status})`, request.url));
    }
    
    // Получаем данные пользователя
    const userData = await userResponse.json();
    
    // Проверяем наличие данных пользователя
    if (!userData.data || userData.data.length === 0) {
      console.error('Отсутствуют данные пользователя в ответе Twitch');
      return NextResponse.redirect(new URL('/auth?error=no_user_data&message=Не получены данные пользователя от Twitch', request.url));
    }
    
    const user = userData.data[0];
    
    // Получаем подписчиков пользователя
    const followersResponse = await fetch(`https://api.twitch.tv/helix/users/follows?to_id=${user.id}`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Client-ID': clientId,
      },
    });
    
    let followersCount = 0;
    let followers = [];
    
    if (followersResponse.ok) {
      const followersData = await followersResponse.json();
      followersCount = followersData.total || 0;
      followers = followersData.data.map(f => f.from_name);
    }
    
    // Получаем подписки пользователя
    const followingsResponse = await fetch(`https://api.twitch.tv/helix/users/follows?from_id=${user.id}`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Client-ID': clientId,
      },
    });
    
    let followingsCount = 0;
    let followings = [];
    
    if (followingsResponse.ok) {
      const followingsData = await followingsResponse.json();
      followingsCount = followingsData.total || 0;
      followings = followingsData.data.map(f => f.to_name);
    }
    
    // Определяем статус стримера (150+ подписчиков)
    const isStreamer = followersCount >= 150;
    
    // Формируем данные профиля
    const profileData = {
      twitchName: user.display_name,
      followersCount,
      followers,
      followingsCount,
      followings,
      id: user.id,
      profileImageUrl: user.profile_image_url,
      isStreamer
    };
    
    // Создаем новый объект Response для установки куки
    const response = NextResponse.redirect(new URL('/menu', request.url));
    
    // Устанавливаем куки с токенами и данными пользователя
    response.cookies.set('twitch_access_token', access_token, { 
      path: '/', 
      httpOnly: true, 
      sameSite: 'lax', 
      maxAge: expires_in 
    });
    
    response.cookies.set('twitch_refresh_token', refresh_token, { 
      path: '/', 
      httpOnly: true, 
      sameSite: 'lax', 
      maxAge: 31536000 // 1 год
    });
    
    return response;
  } catch (error) {
    console.error('Ошибка при обработке обратного вызова от Twitch:', error);
    return NextResponse.redirect(new URL(`/auth?error=server_error&message=${encodeURIComponent(error.message || 'Внутренняя ошибка сервера')}`, request.url));
  }
} 