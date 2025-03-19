import { NextResponse } from 'next/server';
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

    // Получаем данные пользователя из запроса
    try {
      const requestData = await request.json();
      const userData = requestData.user;
      
      if (!userData || !userData.id) {
        return NextResponse.json({ 
          valid: false, 
          error: 'Отсутствуют данные пользователя' 
        }, { status: 401 });
      }
      
      // Токен действителен и данные пользователя есть
      return NextResponse.json({ 
        valid: true,
        user: userData 
      });
    } catch (error) {
      console.error('Ошибка при обработке данных запроса:', error);
      return NextResponse.json({ 
        valid: false, 
        error: 'Некорректные данные запроса' 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Ошибка при проверке токена:', error);
    return NextResponse.json({ 
      valid: false, 
      error: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
} 