import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    // Создаем новый объект Response для установки куки
    const response = NextResponse.redirect(new URL('/auth', request.url));
    
    // Удаляем куки, связанные с авторизацией
    response.cookies.delete('twitch_access_token');
    response.cookies.delete('twitch_refresh_token');
    response.cookies.delete('twitch_user');
    response.cookies.delete('twitch_auth_state');
    
    // Возвращаем ответ с удаленными куками
    return response;
  } catch (error) {
    console.error('Ошибка при выходе из Twitch:', error);
    return NextResponse.json({ error: 'Ошибка при выходе' }, { status: 500 });
  }
} 