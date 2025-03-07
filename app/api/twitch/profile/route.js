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
  try {
    console.log('Profile API - Начало обработки запроса');
    
    // Получаем токен доступа из cookies
    const cookieStore = cookies();
    let accessToken = cookieStore.get('twitch_access_token')?.value;

    console.log('Profile API - accessToken из cookies:', accessToken ? 'присутствует' : 'отсутствует');
    
    // Если токен не найден в cookies, проверяем заголовок Authorization
    const authHeader = request.headers.get('authorization');
    if (!accessToken && authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7);
        console.log('Profile API - accessToken из заголовка Authorization:', 'присутствует');
      }
    }
    
    // Если токен все еще не найден, проверяем параметры запроса
    const url = new URL(request.url);
    if (!accessToken && url.searchParams.get('access_token')) {
      accessToken = url.searchParams.get('access_token');
      console.log('Profile API - accessToken из query параметров:', 'присутствует');
    }

    // Проверяем, что токен не пустой и не undefined
    if (!accessToken || accessToken === 'undefined' || accessToken === 'null') {
      console.error('Profile API - Токен доступа не найден или недействителен');
      return NextResponse.json({ 
        error: 'Не авторизован', 
        message: 'Токен доступа не найден или недействителен. Пожалуйста, войдите снова.' 
      }, { status: 401 });
    }

    // Логируем токен для отладки (только первые 10 символов)
    console.log('Profile API - Используемый токен:', accessToken.substring(0, 10) + '...');

    // Проверяем валидность токена
    try {
      console.log('Profile API - Проверка валидности токена...');
      
      // Делаем тестовый запрос к Twitch API для проверки токена
      const validateResponse = await axios.get('https://id.twitch.tv/oauth2/validate', {
        headers: {
          'Authorization': `OAuth ${accessToken}`
        }
      });
      
      console.log('Profile API - Токен валиден, информация:', validateResponse.data);
    } catch (tokenError) {
      console.error('Profile API - Ошибка проверки токена:', tokenError.message);
      
      if (tokenError.response && tokenError.response.status === 401) {
        // Пробуем обновить токен, если есть refresh_token
        const refreshToken = cookieStore.get('twitch_refresh_token')?.value;
        
        if (refreshToken) {
          try {
            console.log('Profile API - Попытка обновить токен доступа...');
            
            const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
            const clientSecret = process.env.TWITCH_CLIENT_SECRET;
            
            const refreshResponse = await axios.post('https://id.twitch.tv/oauth2/token', 
              new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: clientId,
                client_secret: clientSecret
              }).toString(),
              {
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded'
                }
              }
            );
            
            if (refreshResponse.data && refreshResponse.data.access_token) {
              accessToken = refreshResponse.data.access_token;
              const newRefreshToken = refreshResponse.data.refresh_token;
              
              // Обновляем куки с новыми токенами
              const response = NextResponse.next();
              response.cookies.set('twitch_access_token', accessToken, {
                path: '/',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7 // 7 дней
              });
              
              if (newRefreshToken) {
                response.cookies.set('twitch_refresh_token', newRefreshToken, {
                  path: '/',
                  httpOnly: true,
                  secure: process.env.NODE_ENV === 'production',
                  sameSite: 'lax',
                  maxAge: 60 * 60 * 24 * 30 // 30 дней
                });
              }
              
              console.log('Profile API - Токен успешно обновлен');
            } else {
              throw new Error('Не удалось получить новый токен доступа');
            }
          } catch (refreshError) {
            console.error('Profile API - Ошибка обновления токена:', refreshError.message);
            return NextResponse.json({ 
              error: 'Срок действия токена авторизации истёк', 
              message: 'Не удалось обновить токен. Пожалуйста, войдите снова.' 
            }, { status: 401 });
          }
        } else {
          return NextResponse.json({ 
            error: 'Срок действия токена авторизации истёк', 
            message: 'Пожалуйста, войдите снова.' 
          }, { status: 401 });
        }
      } else {
        // Продолжаем выполнение, даже если проверка не удалась
        console.log('Profile API - Продолжаем выполнение, несмотря на ошибку проверки токена');
      }
    }

    // Получаем данные пользователя
    try {
      console.log('Profile API - Запрос данных пользователя...');
      
      const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
        headers: {
          'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      console.log('Profile API - Статус ответа:', userResponse.status);
      console.log('Profile API - Данные ответа:', {
        hasData: userResponse.data.data ? 'да' : 'нет',
        dataLength: userResponse.data.data ? userResponse.data.data.length : 0
      });

      if (!userResponse.data.data || userResponse.data.data.length === 0) {
        console.error('Profile API - Пользователь не найден в ответе Twitch API');
        return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
      }

      const user = userResponse.data.data[0];
      const userId = user.id;
      const twitchName = user.display_name;
      const profileImageUrl = user.profile_image_url;

      console.log('Profile API - Данные пользователя получены:', { userId, twitchName });

      // Получаем подписчиков (с ограничением для производительности)
      let followers = [];
      let totalFollowersCount = 0;

      try {
        console.log(`Profile API - Запрос подписчиков...`);
        
        const followersResponse = await axios.get(`https://api.twitch.tv/helix/users/follows?to_id=${userId}`, {
          headers: {
            'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        totalFollowersCount = followersResponse.data.total || 0;
        followers = followersResponse.data.data ? followersResponse.data.data.map((f) => f.from_name) : [];

        console.log(`Profile API - Получено ${followers.length} подписчиков из ${totalFollowersCount}`);
      } catch (err) {
        console.error('Error fetching followers:', err.message);
        // Если произошла ошибка, устанавливаем пустой массив и 0 подписчиков
        followers = [];
        totalFollowersCount = 0;
      }

      // Получаем подписки пользователя (с ограничением для производительности)
      let followings = [];
      let totalFollowingsCount = 0;

      try {
        console.log(`Profile API - Запрос подписок...`);
        
        const followingsResponse = await axios.get(`https://api.twitch.tv/helix/users/follows?from_id=${userId}`, {
          headers: {
            'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        totalFollowingsCount = followingsResponse.data.total || 0;
        followings = followingsResponse.data.data ? followingsResponse.data.data.map((f) => f.to_name) : [];

        console.log(`Profile API - Получено ${followings.length} подписок из ${totalFollowingsCount}`);
      } catch (err) {
        console.error('Error fetching followings:', err.message);
        // Если произошла ошибка, устанавливаем пустой массив и 0 подписок
        followings = [];
        totalFollowingsCount = 0;
      }

      // Определяем статус стримера (подписчиков >= 150)
      const isStreamer = totalFollowersCount >= 150;
      
      console.log(`Проверка статуса стримера: ${totalFollowersCount} подписчиков, статус: ${isStreamer ? 'стример' : 'зритель'}`);

      // Формируем данные профиля
      const profileData = {
        twitchName,
        followersCount: totalFollowersCount || followers.length,
        followers,
        followingsCount: totalFollowingsCount || followings.length,
        followings,
        id: userId,
        profileImageUrl,
        isStreamer, // Добавляем статус стримера в данные профиля
      };

      // Логируем подробную информацию о данных профиля
      console.log('Возвращаемые данные профиля:', { 
        twitchName,
        followersCount: totalFollowersCount,
        followersData: followers.length > 0 ? `${followers.length} подписчиков загружено` : 'нет данных',
        followingsCount: totalFollowingsCount,
        followingsData: followings.length > 0 ? `${followings.length} подписок загружено` : 'нет данных',
        isStreamer,
      });

      // Обновляем куку с данными пользователя
      const userDataForCookie = {
        id: userId,
        login: user.login,
        display_name: twitchName,
        profile_image_url: profileImageUrl,
      };
      
      const response = NextResponse.json(sanitizeObject(profileData));
      
      response.cookies.set('twitch_user', JSON.stringify(userDataForCookie), {
        path: '/',
        httpOnly: false, // Нужен доступ из JavaScript
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 дней
      });
      
      console.log('Profile API - Обновлена кука с данными пользователя');

      return response;
    } catch (apiError) {
      console.error('Ошибка при запросе к Twitch API:', apiError.message);
      
      if (apiError.response) {
        console.error('Детали ошибки Twitch API:', {
          status: apiError.response.status,
          data: apiError.response.data
        });
        
        if (apiError.response.status === 401) {
          return NextResponse.json({ 
            error: 'Срок действия токена авторизации истёк', 
            message: 'Пожалуйста, войдите снова.' 
          }, { status: 401 });
        }
      }
      
      throw apiError; // Пробрасываем ошибку для обработки в блоке catch
    }
  } catch (error) {
    console.error('Ошибка профиля Twitch:', error);
    
    if (error.response) {
      console.error('Детали ошибки API:', {
        status: error.response.status,
        data: error.response.data
      });
      
      if (error.response.status === 401) {
        return NextResponse.json({ 
          error: 'Срок действия токена авторизации истёк',
          message: 'Пожалуйста, войдите снова.'
        }, { status: 401 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Ошибка сервера', 
      message: error.message || 'Неизвестная ошибка при получении данных профиля'
    }, { status: 500 });
  }
} 