import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createPool } from '@vercel/postgres';

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

// Функция для валидации URL
function isValidUrl(url) {
  if (!url || url === '') return true; // Пустая строка допустима
  
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch (e) {
    return false;
  }
}

// API-эндпоинт с путем /api/user-socials
export async function GET(request) {
  try {
    // Получаем токен доступа из cookies
    const cookieStore = cookies();
    const accessToken = cookieStore.get('twitch_access_token')?.value;
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Получаем данные пользователя через Twitch API
    const userResponse = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (!userResponse.ok) {
      if (userResponse.status === 401) {
        return NextResponse.json({ error: 'Authentication token expired' }, { status: 401 });
      }
      throw new Error(`Failed to get user: ${userResponse.status}`);
    }
    
    const userData = await userResponse.json();
    const userId = userData.data[0].id;

    // Получаем социальные ссылки из базы данных
    const pool = createPool({ connectionString: process.env.POSTGRES_URL });
    const result = await pool.query('SELECT social_links FROM user_socials WHERE user_id = $1', [userId]);
    const socialLinks = result.rows[0]?.social_links || {
      description: '',
      twitch: '',
      youtube: '',
      discord: '',
      telegram: '',
      vk: '',
      yandexMusic: '',
      isMusician: false
    };
    
    return NextResponse.json(socialLinks);
  } catch (error) {
    console.error('Socials API error:', error);
    return NextResponse.json({ error: 'Server error', message: error.message }, { status: 500 });
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
    
    const userData = await userResponse.json();
    
    if (!userData.data || userData.data.length === 0) {
      console.log('User Socials API - Данные пользователя не найдены');
      return NextResponse.json({ error: 'No user data found' }, { status: 404 });
    }
    
    const userId = userData.data[0].id;
    console.log(`User Socials API - Получены данные пользователя: ${userId}`);

    // Получаем данные из запроса
    const requestBody = await request.json();
    console.log('User Socials API - Получены данные из запроса:', requestBody);
    
    // Проверяем формат данных
    let socialLinks = requestBody;
    if (requestBody.socialLinks) {
      socialLinks = requestBody.socialLinks;
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
    console.log('User Socials API - Санитизированные данные:', sanitizedSocialLinks);

    // Сохраняем социальные ссылки в базу данных
    console.log('User Socials API - Сохранение данных в базу данных...');
    try {
      const pool = createPool({ connectionString: process.env.POSTGRES_URL });
      await pool.query(
        'INSERT INTO user_socials (user_id, social_links) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET social_links = $2',
        [userId, sanitizedSocialLinks]
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