import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request) {
  try {
    const { refresh_token } = await request.json();
    
    if (!refresh_token) {
      return NextResponse.json({ error: 'Refresh token is required' }, { status: 400 });
    }
    
    // Получаем client_id и client_secret из переменных окружения
    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.error('Missing Twitch API credentials');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    // Запрос к Twitch API для обновления токена
    const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
        client_id: clientId,
        client_secret: clientSecret
      }
    });
    
    // Возвращаем новый токен
    return NextResponse.json({
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: response.data.expires_in
    });
    
  } catch (error) {
    console.error('Error refreshing token:', error.response?.data || error.message);
    
    // Проверяем, является ли ошибка ответом от Twitch API
    if (error.response) {
      return NextResponse.json({ 
        error: 'Failed to refresh token', 
        details: error.response.data 
      }, { status: error.response.status });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 