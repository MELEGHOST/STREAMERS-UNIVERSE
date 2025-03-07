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
    // Получаем параметры для авторизации
    const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_TWITCH_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL}/api/twitch/callback`;
    
    // Отладочная информация
    console.log('Переменные окружения:');
    console.log('NEXT_PUBLIC_TWITCH_CLIENT_ID:', clientId || 'не установлен');
    console.log('NEXT_PUBLIC_TWITCH_REDIRECT_URI:', redirectUri || 'не установлен');
    console.log('NEXT_PUBLIC_BASE_URL:', process.env.NEXT_PUBLIC_BASE_URL || 'не установлен');
    
    // Проверяем наличие необходимых параметров
    if (!clientId) {
      console.error('Отсутствует NEXT_PUBLIC_TWITCH_CLIENT_ID в переменных окружения');
      // Возвращаем HTML-страницу с информацией об ошибке вместо JSON
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>Ошибка конфигурации</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
            .error-container { max-width: 600px; margin: 0 auto; background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 5px; }
            h1 { color: #721c24; }
            pre { background: #f8f9fa; padding: 10px; border-radius: 5px; overflow: auto; }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1>Ошибка конфигурации сервера</h1>
            <p>Отсутствует NEXT_PUBLIC_TWITCH_CLIENT_ID в переменных окружения.</p>
            <p>Пожалуйста, убедитесь, что переменные окружения правильно настроены в Vercel.</p>
          </div>
        </body>
        </html>`,
        {
          status: 500,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
          },
        }
      );
    }
    
    if (!redirectUri) {
      console.error('Отсутствует NEXT_PUBLIC_TWITCH_REDIRECT_URI в переменных окружения');
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>Ошибка конфигурации</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
            .error-container { max-width: 600px; margin: 0 auto; background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 5px; }
            h1 { color: #721c24; }
            pre { background: #f8f9fa; padding: 10px; border-radius: 5px; overflow: auto; }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1>Ошибка конфигурации сервера</h1>
            <p>Отсутствует NEXT_PUBLIC_TWITCH_REDIRECT_URI или NEXT_PUBLIC_BASE_URL в переменных окружения.</p>
            <p>Пожалуйста, убедитесь, что переменные окружения правильно настроены в Vercel.</p>
          </div>
        </body>
        </html>`,
        {
          status: 500,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
          },
        }
      );
    }
    
    // Формируем URL для авторизации
    const scope = 'user:read:email user:read:follows';
    const responseType = 'code';
    const authUrl = new URL('https://id.twitch.tv/oauth2/authorize');
    
    // Добавляем параметры
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', responseType);
    authUrl.searchParams.append('scope', scope);
    authUrl.searchParams.append('force_verify', 'true'); // Всегда запрашивать подтверждение
    
    // Добавляем состояние для защиты от CSRF
    const state = generateRandomString(32);
    authUrl.searchParams.append('state', state);
    
    // Сохраняем состояние в куки для проверки при возврате
    const cookieStore = cookies();
    cookieStore.set('twitch_auth_state', state, { 
      path: '/', 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', 
      maxAge: 3600 
    });
    
    // Логируем URL для отладки
    console.log('Redirecting to Twitch auth URL:', authUrl.toString());
    
    // Перенаправляем пользователя на страницу авторизации Twitch
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Ошибка при авторизации через Twitch:', error);
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
      <head>
        <title>Ошибка сервера</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
          .error-container { max-width: 600px; margin: 0 auto; background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 5px; }
          h1 { color: #721c24; }
          pre { background: #f8f9fa; padding: 10px; border-radius: 5px; overflow: auto; }
        </style>
      </head>
      <body>
        <div class="error-container">
          <h1>Внутренняя ошибка сервера</h1>
          <p>При обработке запроса произошла ошибка.</p>
          <p>Детали ошибки:</p>
          <pre>${error.message || 'Неизвестная ошибка'}</pre>
        </div>
      </body>
      </html>`,
      {
        status: 500,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      }
    );
  }
} 