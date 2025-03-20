import { NextResponse } from 'next/server';
import crypto from 'crypto';

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

/**
 * Обработчик GET запроса для инициирования авторизации через Twitch
 */
export async function GET() {
  try {
    // Получаем настройки Twitch API из переменных окружения
    const clientId = process.env.TWITCH_CLIENT_ID;
    const redirectUri = process.env.TWITCH_REDIRECT_URI;
    
    console.log('Твич авторизация инициирована');
    console.log('Клиент ID:', clientId?.substring(0, 5) + '...');
    console.log('Redirect URI:', redirectUri);
    
    if (!clientId || !redirectUri) {
      console.error('Отсутствуют настройки Twitch API');
      return NextResponse.json(
        { error: 'Отсутствуют настройки Twitch API' },
        { status: 500 }
      );
    }
    
    // Формируем URL для авторизации через Twitch
    const scopes = [
      'user:read:email',
      'user:read:follows',
      'channel:read:subscriptions'
    ].join(' ');
    
    const authUrl = new URL('https://id.twitch.tv/oauth2/authorize');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', scopes);
    authUrl.searchParams.append('force_verify', 'true');
    
    // Генерируем случайное состояние для защиты от CSRF
    // Используем более надежный метод генерации состояния
    const state = crypto.randomBytes(16).toString('base64url');
    authUrl.searchParams.append('state', state);
    
    // Логируем полный URL авторизации
    console.log('Авторизационный URL:', authUrl.toString());
    
    // Перенаправляем пользователя на страницу авторизации Twitch
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Ошибка при инициировании авторизации через Twitch:', error);
    return NextResponse.json(
      { error: 'Произошла ошибка при инициировании авторизации' },
      { status: 500 }
    );
  }
} 