import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Pool } from '@vercel/postgres';

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
    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
    const result = await pool.query('SELECT social_links FROM user_socials WHERE user_id = $1', [userId]);
    const socialLinks = result.rows[0]?.social_links || {
      twitter: '',
      youtube: '',
      discord: '',
      description: '',
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

    // Сохраняем социальные ссылки в базу данных
    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
    await pool.query(
      'INSERT INTO user_socials (user_id, social_links) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET social_links = $2',
      [userId, socialLinks]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Socials API error:', error);
    return NextResponse.json({ error: 'Server error', message: error.message }, { status: 500 });
  }
} 