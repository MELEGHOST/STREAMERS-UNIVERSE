import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createPool } from '@vercel/postgres';
import { escapeHtml, sanitizeObject, isValidUrl } from '@/utils/securityUtils';

// API-эндпоинт с путем /api/user-socials
export async function GET(request) {
  try {
    console.log('User-Socials API: GET запрос получен');
    
    // Получаем токен доступа из cookies
    const cookieStore = cookies();
    const accessToken = cookieStore.get('twitch_access_token')?.value;
    
    if (!accessToken) {
      console.log('User-Socials API: Отсутствует токен авторизации');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Определяем тип устройства по User-Agent
    const userAgent = request.headers.get('user-agent') || '';
    const isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent);
    const platform = isMobile ? 'mobile' : 'desktop';
    console.log(`User-Socials API: Запрос с устройства типа ${platform}, User-Agent: ${userAgent.substring(0, 50)}...`);

    try {
      // Получаем данные пользователя через Twitch API
      console.log('User-Socials API: Запрос данных пользователя от Twitch API');
      const userResponse = await fetch('https://api.twitch.tv/helix/users', {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      if (!userResponse.ok) {
        console.error(`User-Socials API: Ошибка при получении данных пользователя: ${userResponse.status}`);
        if (userResponse.status === 401) {
          return NextResponse.json({ error: 'Authentication token expired' }, { status: 401 });
        }
        throw new Error(`Failed to get user: ${userResponse.status}`);
      }
      
      const userData = await userResponse.json();
      
      if (!userData.data || userData.data.length === 0) {
        console.error('User-Socials API: Данные пользователя не найдены в ответе Twitch API');
        return NextResponse.json({ error: 'User data not found' }, { status: 404 });
      }
      
      const userId = userData.data[0].id;
      console.log(`User-Socials API: Пользователь ID ${userId} найден`);

      try {
        // Получаем социальные ссылки из базы данных
        console.log('User-Socials API: Попытка получить социальные ссылки из базы данных');
        const pool = createPool({ connectionString: process.env.POSTGRES_URL });
        const result = await pool.query('SELECT user_data FROM user_socials WHERE user_id = $1', [userId]);
        
        if (result.rows.length > 0 && result.rows[0].user_data) {
          console.log('User-Socials API: Данные получены из базы данных:', JSON.stringify(result.rows[0].user_data).substring(0, 100) + '...');
          
          // Получаем данные пользователя
          const userData = result.rows[0].user_data;
          
          // Формируем ответ
          const response = {
            // Социальные ссылки
            description: '',
            twitch: '',
            youtube: '',
            discord: '',
            telegram: '',
            vk: '',
            yandexMusic: '',
            isMusician: false,
            
            // Дополнительные данные профиля
            birthday: null,
            showBirthday: true,
            statsVisibility: {
              followers: true,
              followings: true,
              streams: true,
              channel: true,
              accountInfo: true
            }
          };
          
          // Обновляем данные из базы, если они есть
          if (userData.socialLinks) {
            response.description = userData.socialLinks.description || '';
            response.twitch = userData.socialLinks.twitch || '';
            response.youtube = userData.socialLinks.youtube || '';
            response.discord = userData.socialLinks.discord || '';
            response.telegram = userData.socialLinks.telegram || '';
            response.vk = userData.socialLinks.vk || '';
            response.yandexMusic = userData.socialLinks.yandexMusic || '';
            response.isMusician = !!userData.socialLinks.isMusician;
          }
          
          // Обновляем дополнительные данные
          if (userData.birthday !== undefined) {
            response.birthday = userData.birthday;
          }
          
          if (userData.showBirthday !== undefined) {
            response.showBirthday = userData.showBirthday;
          }
          
          if (userData.statsVisibility) {
            response.statsVisibility = {
              ...response.statsVisibility,
              ...userData.statsVisibility
            };
          }
          
          return NextResponse.json(response);
        } else {
          console.log('User-Socials API: Социальные ссылки не найдены в базе данных, возвращаем пустой объект');
          // Возвращаем пустую структуру, если нет данных
          return NextResponse.json({
            description: '',
            twitch: '',
            youtube: '',
            discord: '',
            telegram: '',
            vk: '',
            yandexMusic: '',
            isMusician: false,
            birthday: null,
            showBirthday: true,
            statsVisibility: {
              followers: true,
              followings: true,
              streams: true,
              channel: true,
              accountInfo: true
            }
          });
        }
      } catch (dbError) {
        console.error('User-Socials API: Ошибка при работе с базой данных:', dbError);
        // В случае проблем с базой данных возвращаем пустой результат вместо ошибки
        return NextResponse.json({
          description: '',
          twitch: '',
          youtube: '',
          discord: '',
          telegram: '',
          vk: '',
          yandexMusic: '',
          isMusician: false,
          birthday: null,
          showBirthday: true,
          statsVisibility: {
            followers: true,
            followings: true,
            streams: true,
            channel: true,
            accountInfo: true
          }
        });
      }
    } catch (twitchError) {
      console.error('User-Socials API: Ошибка при работе с Twitch API:', twitchError);
      throw twitchError;
    }
  } catch (error) {
    console.error('User-Socials API: Критическая ошибка:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    console.log('User Socials API - Начало обработки POST-запроса');
    
    // Получаем токен доступа из cookies или заголовка Authorization
    const cookieStore = cookies();
    let accessToken = cookieStore.get('twitch_access_token')?.value;
    
    // Если токен не найден в cookies, проверяем заголовок Authorization
    const authHeader = request.headers.get('authorization');
    if (!accessToken && authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7);
        console.log('User Socials API - accessToken из заголовка Authorization:', 'присутствует');
      }
    }
    
    if (!accessToken) {
      console.log('User Socials API - Токен доступа не найден');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('User Socials API - Токен доступа найден');

    // Получаем данные пользователя через Twitch API
    console.log('User Socials API - Запрос данных пользователя...');
    const userResponse = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (!userResponse.ok) {
      console.log(`User Socials API - Ошибка при получении данных пользователя: ${userResponse.status}`);
      if (userResponse.status === 401) {
        return NextResponse.json({ error: 'Authentication token expired' }, { status: 401 });
      }
      throw new Error(`Failed to get user: ${userResponse.status}`);
    }
    
    const twitchUserData = await userResponse.json();
    
    if (!twitchUserData.data || twitchUserData.data.length === 0) {
      console.log('User Socials API - Данные пользователя не найдены');
      return NextResponse.json({ error: 'No user data found' }, { status: 404 });
    }
    
    const userId = twitchUserData.data[0].id;
    console.log(`User Socials API - Получены данные пользователя: ${userId}`);

    // Получаем данные из запроса
    const requestBody = await request.json();
    console.log('User Socials API - Получены данные из запроса:', requestBody);
    
    // Извлекаем данные из запроса
    let socialLinks = requestBody;
    let birthday = null;
    let showBirthday = true;
    let statsVisibility = {
      followers: true,
      followings: true,
      streams: true,
      channel: true,
      accountInfo: true
    };
    
    // Если используется структурированный формат запроса
    if (requestBody.socialLinks) {
      socialLinks = requestBody.socialLinks;
      birthday = requestBody.birthday || null;
      showBirthday = requestBody.showBirthday !== undefined ? requestBody.showBirthday : true;
      statsVisibility = requestBody.statsVisibility || statsVisibility;
    }
    
    console.log('User Socials API - Обрабатываемые данные:', socialLinks);
    
    // Валидация URL-адресов
    if (socialLinks) {
      const urlFields = ['twitch', 'youtube', 'discord', 'telegram', 'vk', 'yandexMusic'];
      for (const field of urlFields) {
        if (socialLinks[field] && !isValidUrl(socialLinks[field])) {
          console.log(`User Socials API - Недопустимый URL в поле ${field}`);
          return NextResponse.json({ 
            error: 'Invalid URL', 
            message: `Поле ${field} содержит недопустимый URL` 
          }, { status: 400 });
        }
      }
    }
    
    // Санитизация данных перед сохранением в базу данных
    const sanitizedSocialLinks = sanitizeObject(socialLinks);
    const userProfileData = {
      socialLinks: sanitizedSocialLinks,
      birthday: birthday,
      showBirthday: showBirthday,
      statsVisibility: statsVisibility
    };
    
    console.log('User Socials API - Санитизированные данные:', userProfileData);

    // Сохраняем данные пользователя в базу данных
    console.log('User Socials API - Сохранение данных в базу данных...');
    try {
      const pool = createPool({ connectionString: process.env.POSTGRES_URL });
      await pool.query(
        'INSERT INTO user_socials (user_id, user_data) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET user_data = $2',
        [userId, userProfileData]
      );
      console.log('User Socials API - Данные успешно сохранены');
    } catch (dbError) {
      console.error('User Socials API - Ошибка при сохранении данных в базу данных:', dbError);
      throw dbError;
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('User Socials API error:', error);
    return NextResponse.json({ error: 'Server error', message: error.message }, { status: 500 });
  }
} 