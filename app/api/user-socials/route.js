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

    // Получаем данные из запроса
    const { socialLinks } = await request.json();
    
    // Валидация URL-адресов
    if (socialLinks) {
      const urlFields = ['twitch', 'youtube', 'discord', 'telegram', 'vk', 'yandexMusic'];
      for (const field of urlFields) {
        if (socialLinks[field] && !isValidUrl(socialLinks[field])) {
          return NextResponse.json({ 
            error: 'Invalid URL', 
            message: `Поле ${field} содержит недопустимый URL` 
          }, { status: 400 });
        }
      }
    }
    
    // Санитизация данных перед сохранением в базу данных
    const sanitizedSocialLinks = sanitizeObject(socialLinks);

    // Сохраняем социальные ссылки в базу данных
    const pool = createPool({ connectionString: process.env.POSTGRES_URL });
    await pool.query(
      'INSERT INTO user_socials (user_id, social_links) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET social_links = $2',
      [userId, sanitizedSocialLinks]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Socials API error:', error);
    return NextResponse.json({ error: 'Server error', message: error.message }, { status: 500 });
  }
} 