import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import axios from 'axios';
import { escapeHtml, sanitizeObject } from '@/utils/securityUtils';

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
    
    // Проверка CSRF токена для защиты от CSRF атак
    const cookieStore = cookies();
    const csrfTokenCookie = cookieStore.get('csrf_token');
    const csrfToken = request.headers.get('X-CSRF-Token');
    
    // В production среде требуем наличие CSRF токена для всех запросов, кроме OPTIONS
    if (process.env.NODE_ENV === 'production' && request.method !== 'OPTIONS') {
      if (!csrfTokenCookie || !csrfToken || csrfTokenCookie.value !== csrfToken) {
        console.error('Profile API - Ошибка проверки CSRF токена');
        return NextResponse.json({ 
          error: 'Ошибка безопасности', 
          message: 'Недопустимый или отсутствующий CSRF токен'
        }, { status: 403 });
      }
    }

    // Получаем токен доступа из cookies, заголовка Authorization или URL
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
      
      // Обогащаем данные пользователя для фронтенда
      const enhancedUserData = {
        ...user,
        id: user.id,
        login: user.login,
        twitchName: user.display_name,
        profile_image_url: user.profile_image_url,
        followersCount: 0,  // Эти данные будут загружены на фронтенде
        followers: [],
        followingsCount: 0,
        followings: [],
        email: user.email || '',
        description: user.description || '',
        // По умолчанию считаем пользователя зрителем, не стримером
        isStreamer: false
      };
      
      // Очищаем таймаут, так как получили данные
      clearTimeout(timeoutId);
      
      return enhancedUserData;
    })();

    // Ожидаем либо успешное получение данных, либо таймаут
    const userData = await Promise.race([fetchProfilePromise, timeoutPromise]);
    
    // Очищаем данные пользователя перед отправкой для предотвращения XSS-атак
    const sanitizedUserData = sanitizeObject(userData);
    
    // Устанавливаем куки с данными о пользователе
    const simplifiedUserData = {
      id: sanitizedUserData.id,
      login: sanitizedUserData.login,
      display_name: sanitizedUserData.display_name,
      profile_image_url: sanitizedUserData.profile_image_url,
    };
    
    // Устанавливаем куку с данными пользователя
    cookies().set('twitch_user', JSON.stringify(simplifiedUserData), { 
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 дней
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false // Делаем доступным для JavaScript
    });
    
    // Отправляем данные пользователя
    return NextResponse.json(sanitizedUserData);
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