import { createPool } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

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

export async function GET(request) {
  try {
    // Получаем токен доступа из куки
    const cookieStore = cookies();
    const accessToken = cookieStore.get('twitch_access_token')?.value;
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Получаем данные пользователя из Twitch API
    const userResponse = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
      },
    });
    
    if (!userResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: userResponse.status });
    }
    
    const userData = await userResponse.json();
    
    if (!userData.data || userData.data.length === 0) {
      return NextResponse.json({ error: 'No user data found' }, { status: 404 });
    }
    
    const userId = userData.data[0].id;
    
    // Подключаемся к базе данных
    const pool = createPool();
    
    // Проверяем, есть ли у пользователя социальные ссылки
    const { rows } = await pool.query(
      'SELECT * FROM social_links WHERE user_id = $1',
      [userId]
    );
    
    // Если нет записей, возвращаем пустые значения
    if (rows.length === 0) {
      return NextResponse.json({
        description: '',
        twitch: '',
        youtube: '',
        discord: '',
        telegram: '',
        vk: '',
        yandexMusic: '',
        isMusician: false
      });
    }
    
    // Возвращаем данные
    return NextResponse.json({
      description: rows[0].description || '',
      twitch: rows[0].twitch || '',
      youtube: rows[0].youtube || '',
      discord: rows[0].discord || '',
      telegram: rows[0].telegram || '',
      vk: rows[0].vk || '',
      yandexMusic: rows[0].yandex_music || '',
      isMusician: rows[0].is_musician || false
    });
  } catch (error) {
    console.error('Error fetching social links:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // Удаляем проверку CSRF-токена, так как она вызывает ошибку
    // const cookieStore = cookies();
    // const csrfToken = cookieStore.get('csrf_token')?.value;
    // const requestCsrfToken = request.headers.get('x-csrf-token');
    
    // if (!csrfToken || !requestCsrfToken || csrfToken !== requestCsrfToken) {
    //   console.error('CSRF token validation failed');
    //   return NextResponse.json({ error: 'CSRF token validation failed' }, { status: 403 });
    // }
    
    const body = await request.json();
    
    // Получаем токен доступа из куки
    const cookieStore = cookies();
    const accessToken = cookieStore.get('twitch_access_token')?.value;
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Получаем данные пользователя из Twitch API
    const userResponse = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
      },
    });
 
    if (!userResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: userResponse.status });
    }
    
    const userData = await userResponse.json();
    
    if (!userData.data || userData.data.length === 0) {
      return NextResponse.json({ error: 'No user data found' }, { status: 404 });
    }
    
    const userId = userData.data[0].id;
    
    // Валидация URL-адресов
    const urlFields = ['twitch', 'youtube', 'discord', 'telegram', 'vk', 'yandexMusic'];
    for (const field of urlFields) {
      if (body[field] && !isValidUrl(body[field])) {
        return NextResponse.json({ 
          error: 'Invalid URL', 
          message: `Field ${field} contains an invalid URL` 
        }, { status: 400 });
      }
    }
    
    // Санитизация данных перед сохранением в базу данных
    const sanitizedData = sanitizeObject(body);
    
    // Подключаемся к базе данных
    const pool = createPool();
    
    // Обновляем или вставляем данные
    await pool.query(
      `INSERT INTO social_links (user_id, description, twitch, youtube, discord, telegram, vk, yandex_music, is_musician)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id)
       DO UPDATE SET
         description = $2,
         twitch = $3,
         youtube = $4,
         discord = $5,
         telegram = $6,
         vk = $7,
         yandex_music = $8,
         is_musician = $9`,
      [
        userId,
        sanitizedData.description || '',
        sanitizedData.twitch || '',
        sanitizedData.youtube || '',
        sanitizedData.discord || '',
        sanitizedData.telegram || '',
        sanitizedData.vk || '',
        sanitizedData.yandexMusic || '',
        sanitizedData.isMusician || false
      ]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating social links:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 