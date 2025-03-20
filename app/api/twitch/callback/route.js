import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { createToken } from '@/lib/auth';

/**
 * Получение или создание пользователя в базе данных
 */
async function getOrCreateUser(twitchUser) {
  // Проверяем, существует ли пользователь с таким twitchId
  let user = await prisma.user.findUnique({
    where: {
      twitchId: twitchUser.id
    }
  });
  
  // Если пользователь не найден, создаем нового
  if (!user) {
    user = await prisma.user.create({
      data: {
        twitchId: twitchUser.id,
        username: twitchUser.login,
        displayName: twitchUser.display_name,
        email: twitchUser.email,
        avatar: twitchUser.profile_image_url,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  } else {
    // Обновляем данные существующего пользователя
    user = await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        username: twitchUser.login,
        displayName: twitchUser.display_name,
        email: twitchUser.email,
        avatar: twitchUser.profile_image_url,
        updatedAt: new Date()
      }
    });
  }
  
  return user;
}

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
    const state = searchParams.get('state');
    
    // Получаем настройки Twitch API из переменных окружения
    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    let redirectUri = process.env.TWITCH_REDIRECT_URI;
    
    // Формируем актуальный URI из текущего запроса
    const requestUrl = new URL(request.url);
    const actualRedirectUri = `${requestUrl.protocol}//${requestUrl.host}${requestUrl.pathname}`;
    
    // Подробное логирование для отладки
    console.log('=== Twitch callback received ===');
    console.log('Current URL:', request.url);
    console.log('Configured redirect URI:', redirectUri);
    console.log('Actual redirect URI:', actualRedirectUri);
    console.log('Code present:', !!code);
    console.log('Error:', error);
    console.log('Error description:', errorDescription);
    console.log('State:', state);
    console.log('TWITCH_CLIENT_ID present:', !!clientId);
    console.log('TWITCH_CLIENT_SECRET present:', !!clientSecret);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    // Проверяем наличие ошибок
    if (error) {
      console.error(`Ошибка авторизации Twitch: ${error} - ${errorDescription}`);
      
      // Ошибка несоответствия URI
      if (error === 'redirect_mismatch') {
        // Используем URL параметризацию для отображения ошибки
        const redirectUrl = new URL(`${process.env.NEXT_PUBLIC_APP_URL || 'https://streamers-universe.vercel.app'}/auth`);
        redirectUrl.searchParams.append('error', 'redirect_mismatch');
        redirectUrl.searchParams.append('configured', redirectUri || 'not_set');
        redirectUrl.searchParams.append('actual', actualRedirectUri);
        
        console.error(`Несоответствие redirectUri. Настроено: ${redirectUri}, Фактический: ${actualRedirectUri}`);
        console.error('Необходимо обновить настройки в консоли разработчика Twitch!');
        
        return NextResponse.redirect(redirectUrl.toString());
      }
      
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'https://streamers-universe.vercel.app'}/auth?error=${error}`);
    }
    
    // Проверяем наличие кода авторизации
    if (!code) {
      console.error('Отсутствует код авторизации в ответе Twitch');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'https://streamers-universe.vercel.app'}/auth?error=no_code`);
    }
    
    if (!clientId || !clientSecret || !redirectUri) {
      console.error('Отсутствуют настройки Twitch API');
      if (!redirectUri) {
        // Если URI редиректа не задан в переменных окружения, используем актуальный
        redirectUri = actualRedirectUri;
        console.log('TWITCH_REDIRECT_URI не задан, используем актуальный URL:', redirectUri);
      }
      
      if (!clientId || !clientSecret) {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'https://streamers-universe.vercel.app'}/auth?error=config_error`);
      }
    }
    
    // Обмениваем код авторизации на токен доступа
    console.log('Отправляем запрос на получение токена с redirect_uri:', redirectUri);
    
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
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error('Ошибка при получении токена доступа:', errorData);
      
      // Формируем URL с подробной информацией об ошибке
      const redirectUrl = new URL(`${process.env.NEXT_PUBLIC_APP_URL || 'https://streamers-universe.vercel.app'}/auth`);
      redirectUrl.searchParams.append('error', 'token_error');
      redirectUrl.searchParams.append('status', tokenResponse.status);
      if (errorData.message) {
        redirectUrl.searchParams.append('message', errorData.message);
      }
      
      return NextResponse.redirect(redirectUrl.toString());
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
      const errorData = await userResponse.json().catch(() => ({}));
      console.error('Ошибка при получении данных пользователя:', errorData);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'https://streamers-universe.vercel.app'}/auth?error=user_error`);
    }
    
    const userData = await userResponse.json();
    const twitchUser = userData.data[0];
    
    // Проверяем наличие данных пользователя
    if (!twitchUser) {
      console.error('Данные пользователя отсутствуют в ответе Twitch API');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'https://streamers-universe.vercel.app'}/auth?error=user_data_missing`);
    }
    
    console.log('Получены данные пользователя:', {
      id: twitchUser.id,
      login: twitchUser.login,
      display_name: twitchUser.display_name
    });
    
    try {
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
      
      // Устанавливаем данные пользователя в куки
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
      
      console.log('Аутентификация успешна! Перенаправляем пользователя в меню');
      
      // Перенаправляем пользователя на главную страницу
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'https://streamers-universe.vercel.app'}/menu`);
    } catch (dbError) {
      console.error('Ошибка при работе с базой данных:', dbError);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'https://streamers-universe.vercel.app'}/auth?error=database_error&message=${encodeURIComponent(dbError.message)}`);
    }
  } catch (error) {
    console.error('Ошибка при обработке обратного вызова от Twitch:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'https://streamers-universe.vercel.app'}/auth?error=server_error&message=${encodeURIComponent(error.message)}`);
  }
} 