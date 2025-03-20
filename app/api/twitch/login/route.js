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
export async function GET(request) {
  try {
    // Получаем настройки Twitch API из переменных окружения
    const clientId = process.env.TWITCH_CLIENT_ID;
    let redirectUri = process.env.TWITCH_REDIRECT_URI;
    
    // Проверяем и фиксируем значение redirectUri если оно отсутствует
    if (!redirectUri) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://streamers-universe.vercel.app';
      redirectUri = `${baseUrl}/api/twitch/callback`;
      console.error('Отсутствует TWITCH_REDIRECT_URI, используем значение по умолчанию:', redirectUri);
    }
    
    console.log('=== Детали авторизации Twitch ===');
    console.log('Клиент ID:', clientId ? `${clientId.substring(0, 5)}...` : 'отсутствует');
    console.log('Redirect URI:', redirectUri);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('BASE URL:', process.env.NEXT_PUBLIC_APP_URL);
    console.log('Текущий URL запроса:', request.url);
    
    if (!clientId) {
      console.error('Отсутствует TWITCH_CLIENT_ID');
      return NextResponse.json(
        { error: 'Отсутствуют настройки Twitch API (TWITCH_CLIENT_ID)' },
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
    console.log('Авторизационный URL (полный):', authUrl.toString());
    
    // Перенаправляем пользователя на страницу авторизации Twitch
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Ошибка при инициировании авторизации через Twitch:', error);
    return NextResponse.json(
      { error: 'Произошла ошибка при инициировании авторизации', details: error.message },
      { status: 500 }
    );
  }
} 