import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Функция для генерации случайной строки
function generateRandomString(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  
  return result;
}

export async function GET(request) {
  try {
    console.log('Обработка callback от Twitch...');
    
    // Получаем URL и параметры запроса
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const error_description = url.searchParams.get('error_description');
    
    console.log('Параметры запроса:', { 
      code: code ? 'присутствует' : 'отсутствует',
      state: state ? 'присутствует' : 'отсутствует',
      error: error || 'нет ошибки'
    });
    
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
    
    console.log('Проверка состояния CSRF:', {
      cookieState: cookieState ? 'присутствует' : 'отсутствует',
      urlState: state ? 'присутствует' : 'отсутствует',
      match: cookieState && state ? (cookieState === state ? 'совпадает' : 'не совпадает') : 'невозможно проверить'
    });
    
    // Проверяем соответствие состояния для защиты от CSRF
    if (!cookieState || !state || cookieState !== state) {
      console.error('Несоответствие состояния при авторизации Twitch');
      return NextResponse.redirect(new URL('/auth?error=state_mismatch&message=Ошибка безопасности при авторизации', request.url));
    }
    
    // Получаем параметры для обмена кода на токен
    const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    const redirectUri = process.env.NEXT_PUBLIC_TWITCH_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL}/api/twitch/callback`;
    
    console.log('Параметры для обмена кода на токен:', {
      clientId: clientId ? 'присутствует' : 'отсутствует',
      clientSecret: clientSecret ? 'присутствует' : 'отсутствует',
      redirectUri
    });
    
    // Проверяем наличие необходимых параметров
    if (!clientId || !clientSecret) {
      console.error('Отсутствуют необходимые параметры для обмена кода на токен');
      return NextResponse.redirect(new URL('/auth?error=config_error&message=Ошибка конфигурации сервера', request.url));
    }
    
    console.log('Отправка запроса на обмен кода на токен...');
    
    // Обмениваем код на токен доступа
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
    
    console.log('Статус ответа на запрос токена:', tokenResponse.status);
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error('Ошибка при обмене кода на токен:', tokenResponse.status, errorData);
      return NextResponse.redirect(new URL(`/auth?error=token_error&message=Ошибка получения токена: ${errorData.message || tokenResponse.status}`, request.url));
    }
    
    const tokenData = await tokenResponse.json();
    console.log('Получены данные токена:', {
      access_token: tokenData.access_token ? 'присутствует' : 'отсутствует',
      refresh_token: tokenData.refresh_token ? 'присутствует' : 'отсутствует',
      expires_in: tokenData.expires_in
    });
    
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    
    if (!accessToken) {
      console.error('Токен доступа отсутствует в ответе');
      return NextResponse.redirect(new URL('/auth?error=no_token&message=Не удалось получить токен доступа', request.url));
    }
    
    console.log('Отправка запроса на получение данных пользователя...');
    
    // Получаем данные пользователя
    const userResponse = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-ID': clientId,
      },
    });
    
    console.log('Статус ответа на запрос данных пользователя:', userResponse.status);
    
    if (!userResponse.ok) {
      console.error('Ошибка при получении данных пользователя:', userResponse.status);
      return NextResponse.redirect(new URL('/auth?error=user_error&message=Ошибка получения данных пользователя', request.url));
    }
    
    const userData = await userResponse.json();
    console.log('Получены данные пользователя:', {
      hasData: userData.data ? 'да' : 'нет',
      dataLength: userData.data ? userData.data.length : 0
    });
    
    if (!userData.data || userData.data.length === 0) {
      console.error('Данные пользователя отсутствуют в ответе');
      return NextResponse.redirect(new URL('/auth?error=no_user_data&message=Не удалось получить данные пользователя', request.url));
    }
    
    const user = userData.data[0];
    console.log('Данные пользователя:', {
      id: user.id,
      login: user.login,
      display_name: user.display_name
    });
    
    // Создаем ответ с перенаправлением на главную страницу
    const response = NextResponse.redirect(new URL('/menu', request.url));
    
    console.log('Установка куков с токенами и данными пользователя...');
    
    // Устанавливаем куки с токенами и данными пользователя
    // Используем более безопасные настройки для куков
    response.cookies.set('twitch_access_token', accessToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 дней
    });
    
    if (refreshToken) {
      response.cookies.set('twitch_refresh_token', refreshToken, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 дней
      });
    }
    
    // Сохраняем только необходимые данные пользователя в куки
    // Не сохраняем чувствительные данные
    const userDataForCookie = {
      id: user.id,
      login: user.login,
      display_name: user.display_name,
      profile_image_url: user.profile_image_url,
    };
    
    response.cookies.set('twitch_user', JSON.stringify(userDataForCookie), {
      path: '/',
      httpOnly: false, // Нужен доступ из JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 дней
    });
    
    // Удаляем состояние CSRF после использования
    response.cookies.delete('twitch_auth_state');
    
    console.log('Авторизация успешно завершена, перенаправление на /menu');
    
    return response;
  } catch (error) {
    console.error('Ошибка при обработке callback от Twitch:', error);
    return NextResponse.redirect(new URL(`/auth?error=server_error&message=${encodeURIComponent(error.message || 'Внутренняя ошибка сервера')}`, request.url));
  }
} 