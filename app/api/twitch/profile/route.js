import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import axios from 'axios';

export async function GET(request) {
  try {
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
        return NextResponse.json({ 
          error: 'Срок действия токена авторизации истёк', 
          message: 'Пожалуйста, войдите снова.' 
        }, { status: 401 });
      }
      
      // Продолжаем выполнение, даже если проверка не удалась
      console.log('Profile API - Продолжаем выполнение, несмотря на ошибку проверки токена');
    }

    // Получаем данные пользователя
    try {
      console.log('Profile API - Запрос данных пользователя...');
      
      const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`,
        },
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
            'Client-ID': process.env.TWITCH_CLIENT_ID,
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
            'Client-ID': process.env.TWITCH_CLIENT_ID,
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

      return NextResponse.json(profileData);
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