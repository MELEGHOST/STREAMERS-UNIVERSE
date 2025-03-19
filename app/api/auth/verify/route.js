import { NextResponse } from 'next/server';
import { verifyJwtToken } from '../../../app/utils/auth';
import { validateToken } from '../../../utils/cookies';

export async function POST(request) {
  try {
    // Получаем токен из заголовка
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Отсутствует токен авторизации' 
      }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    // Проверяем токен через Twitch API
    const isValid = await validateToken(token);
    if (!isValid) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Токен недействителен' 
      }, { status: 401 });
    }

    // Проверяем JWT токен
    try {
      const decoded = await verifyJwtToken(token);
      if (!decoded) {
        return NextResponse.json({ 
          valid: false, 
          error: 'JWT токен недействителен' 
        }, { status: 401 });
      }
    } catch (error) {
      console.error('Ошибка при проверке JWT токена:', error);
      return NextResponse.json({ 
        valid: false, 
        error: 'Ошибка при проверке JWT токена' 
      }, { status: 401 });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('Ошибка при проверке токена:', error);
    return NextResponse.json({ 
      valid: false, 
      error: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
} 