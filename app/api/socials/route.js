import { createPool } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

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
    const body = await request.json();
    
    // Валидация входных данных
    const validatedData = {
      description: typeof body.description === 'string' ? body.description.slice(0, 500) : '',
      twitch: typeof body.twitch === 'string' ? body.twitch.slice(0, 100) : '',
      youtube: typeof body.youtube === 'string' ? body.youtube.slice(0, 100) : '',
      discord: typeof body.discord === 'string' ? body.discord.slice(0, 100) : '',
      telegram: typeof body.telegram === 'string' ? body.telegram.slice(0, 100) : '',
      vk: typeof body.vk === 'string' ? body.vk.slice(0, 100) : '',
      yandexMusic: typeof body.yandexMusic === 'string' ? body.yandexMusic.slice(0, 100) : '',
      isMusician: Boolean(body.isMusician)
    };
    
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
        validatedData.description,
        validatedData.twitch,
        validatedData.youtube,
        validatedData.discord,
        validatedData.telegram,
        validatedData.vk,
        validatedData.yandexMusic,
        validatedData.isMusician
      ]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating social links:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 