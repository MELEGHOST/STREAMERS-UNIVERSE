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
      return NextResponse.redirect(new URL(`/auth/result?error=${encodeURIComponent(error)}&message=${encodeURIComponent(error_description || 'Ошибка авторизации')}`, request.url));
    }
    
    // Проверяем наличие кода авторизации
    if (!code) {
      console.error('Отсутствует код авторизации в ответе Twitch');
      return NextResponse.redirect(new URL('/auth/result?error=no_code&message=Не получен код авторизации от Twitch', request.url));
    }
    
    // Получаем состояние из куки для проверки
    const cookieStore = cookies();
    const cookieState = cookieStore.get('twitch_auth_state')?.value;
    
    console.log('Проверка состояния CSRF:', {
      receivedState: state ? state.substring(0, 10) + '...' : 'отсутствует',
      storedState: cookieState ? cookieState.substring(0, 10) + '...' : 'отсутствует',
      match: state && cookieState && state === cookieState ? 'да' : 'нет'
    });
    
    // Проверяем состояние для защиты от CSRF
    if (!state || !cookieState || state !== cookieState) {
      console.error('Несоответствие состояния CSRF');
      return NextResponse.redirect(new URL('/auth/result?error=state_mismatch&message=Ошибка безопасности: несоответствие состояния', request.url));
    }
    
    // Получаем текущий домен из куки или из запроса
    const currentDomain = cookieStore.get('current_domain')?.value || `${url.protocol}//${url.host}`;
    console.log('Callback API - Текущий домен:', currentDomain);
    
    // Получаем параметры для обмена кода на токен
    const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    
    // Определяем правильный URI перенаправления в зависимости от домена
    let redirectUri;
    
    // Проверяем, есть ли в переменных окружения URI для текущего домена
    if (currentDomain.includes('localhost') || currentDomain.includes('127.0.0.1')) {
      // Для локальной разработки
      redirectUri = process.env.NEXT_PUBLIC_TWITCH_REDIRECT_URI_LOCAL || `${currentDomain}/api/twitch/callback`;
      console.log('Callback API - Используем локальный URI перенаправления:', redirectUri);
    } else if (currentDomain.includes('streamers-universe-meleghost-meleghosts-projects.vercel.app')) {
      // Для превью версии - явно указываем полный URI
      redirectUri = 'https://streamers-universe-meleghost-meleghosts-projects.vercel.app/api/twitch/callback';
      console.log('Callback API - Используем фиксированный URI перенаправления для превью:', redirectUri);
    } else if (currentDomain.includes('streamers-universe.vercel.app') || currentDomain.includes('streamers-universe.com')) {
      // Для продакшн версии - явно указываем полный URI
      redirectUri = 'https://streamers-universe.vercel.app/api/twitch/callback';
      console.log('Callback API - Используем фиксированный URI перенаправления для продакшн:', redirectUri);
    } else {
      // Для других доменов или по умолчанию
      redirectUri = process.env.NEXT_PUBLIC_TWITCH_REDIRECT_URI || `${currentDomain}/api/twitch/callback`;
      console.log('Callback API - Используем URI перенаправления по умолчанию:', redirectUri);
    }
    
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
      return NextResponse.redirect(new URL(`/auth/result?error=token_error&message=Ошибка получения токена: ${errorData.message || tokenResponse.status}`, request.url));
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
      return NextResponse.redirect(new URL('/auth/result?error=no_token&message=Не удалось получить токен доступа', request.url));
    }
    
    console.log('Отправка запроса на получение данных пользователя...');
    
    // Получаем данные пользователя
    try {
      const userResponse = await fetch('https://api.twitch.tv/helix/users', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': process.env.TWITCH_CLIENT_ID
        }
      });
      
      if (!userResponse.ok) {
        console.error('Ошибка при получении данных пользователя:', userResponse.status);
        return NextResponse.redirect(new URL('/auth/result?error=user_error&message=Ошибка получения данных пользователя', request.url));
      }
      
      const userData = await userResponse.json();
      
      if (!userData.data || userData.data.length === 0) {
        console.error('Данные пользователя отсутствуют в ответе');
        return NextResponse.redirect(new URL('/auth/result?error=no_user_data&message=Не удалось получить данные пользователя', request.url));
      }
      
      const user = userData.data[0];
      
      // Устанавливаем данные пользователя в куки
      const userDataString = JSON.stringify(user);
      cookies().set('twitch_user', userDataString, { 
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 дней
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });
      
      // Устанавливаем все куки с более строгими параметрами
      cookies().set('twitch_access_token', accessToken, { 
        expires: new Date(Date.now() + tokenData.expires_in * 1000), // 1 час
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true
      });
      
      if (refreshToken) {
        cookies().set('twitch_refresh_token', refreshToken, { 
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 дней
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true
        });
      }
      
      // Записываем данные в локальное хранилище через скрипт
      const injectLocalStorage = `
        <html>
        <head>
          <title>Обработка авторизации...</title>
          <script>
            // Сохраняем данные пользователя и токены в localStorage
            try {
              localStorage.setItem('twitch_user', '${userDataString.replace(/'/g, "\\'")}');
              localStorage.setItem('cookie_twitch_user', '${userDataString.replace(/'/g, "\\'")}');
              localStorage.setItem('twitch_token', '${accessToken}');
              localStorage.setItem('cookie_twitch_access_token', '${accessToken}');
              ${refreshToken ? `localStorage.setItem('cookie_twitch_refresh_token', '${refreshToken}');` : ''}
              localStorage.setItem('is_authenticated', 'true');
              console.log('Данные успешно сохранены в localStorage');
            } catch(e) {
              console.error('Ошибка при сохранении данных в localStorage:', e);
            }

            // Перенаправляем на страницу результатов
            window.location.href = '/auth/result?success=true';
          </script>
        </head>
        <body>
          <h1>Обработка авторизации...</h1>
          <p>Пожалуйста, подождите. Вы будете перенаправлены автоматически.</p>
        </body>
        </html>
      `;
      
      // Возвращаем HTML с инструкциями для сохранения в localStorage
      return new Response(injectLocalStorage, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8'
        }
      });
    } catch (error) {
      console.error('Ошибка при запросе данных пользователя:', error);
      return NextResponse.redirect(new URL(`/auth/result?error=user_request_error&message=Ошибка при запросе данных пользователя: ${error.message}`, request.url));
    }
  } catch (error) {
    console.error('Ошибка при обработке callback от Twitch:', error);
    return NextResponse.redirect(new URL(`/auth/result?error=server_error&message=${encodeURIComponent(error.message || 'Произошла ошибка на сервере')}`, request.url));
  }
} 