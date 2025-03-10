import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import axios from 'axios';

// Функция для экранирования HTML-тегов
function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Функция для очистки объекта от потенциально опасных данных
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        result[key] = escapeHtml(value);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = sanitizeObject(value);
      } else {
        result[key] = value;
      }
    }
  }
  
  return result;
}

export async function GET(request) {
  // Добавляем таймаут для ответа
  const responseTimeout = 15000; // 15 секунд
  let timeoutId;
  
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('API timeout')), responseTimeout);
  });

  try {
    console.log('Profile API - Начало обработки запроса');
    
    // Получаем текущий домен из запроса
    const url = new URL(request.url);
    const currentDomain = `${url.protocol}//${url.host}`;
    const isPreviewVersion = currentDomain.includes('streamers-universe-meleghost-meleghosts-projects.vercel.app');

    if (isPreviewVersion) {
      console.log('Profile API - Превью-версия: текущий домен:', currentDomain);
    }

    // Получаем токен доступа из cookies, заголовка Authorization или URL
    const cookieStore = cookies();
    let accessToken = cookieStore.get('twitch_access_token')?.value;
    
    if (!accessToken) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7);
      } else {
        const urlParams = new URL(request.url);
        accessToken = urlParams.searchParams.get('access_token');
      }
    }

    // Проверяем, что токен существует
    if (!accessToken || accessToken === 'undefined' || accessToken === 'null') {
      return NextResponse.json({ 
        error: 'Не авторизован', 
        message: 'Токен доступа не найден или недействителен. Пожалуйста, войдите снова.' 
      }, { status: 401 });
    }

    // Выполняем основную логику получения данных пользователя
    const fetchProfilePromise = (async () => {
      // Получаем данные пользователя из Twitch API
      const response = await axios.get('https://api.twitch.tv/helix/users', {
        headers: {
          'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.data.data || response.data.data.length === 0) {
        throw new Error('Пользователь не найден в ответе Twitch API');
      }

      const user = response.data.data[0];
      
      // Очищаем таймаут, так как получили данные
      clearTimeout(timeoutId);
      
      return user;
    })();

    // Ожидаем либо успешное получение данных, либо таймаут
    const userData = await Promise.race([fetchProfilePromise, timeoutPromise]);
    
    // Отправляем данные пользователя
    return NextResponse.json(userData);
  } catch (error) {
    clearTimeout(timeoutId);
    
    console.error('Profile API - Ошибка:', error.message);
    
    // Упрощаем логику обработки ошибок
    if (error.response && error.response.status === 401) {
      return NextResponse.json({ 
        error: 'Токен недействителен', 
        message: 'Срок действия токена истек или он был отозван. Пожалуйста, войдите снова.' 
      }, { status: 401 });
    }
    
    return NextResponse.json({ 
      error: 'Ошибка сервера', 
      message: error.message || 'Произошла неизвестная ошибка. Пожалуйста, попробуйте позже.' 
    }, { status: 500 });
  }
} 