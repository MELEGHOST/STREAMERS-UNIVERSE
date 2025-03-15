import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    // Получаем userId из параметров запроса
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Отсутствует userId' },
        { status: 400 }
      );
    }
    
    // Здесь должна быть логика получения социальных ссылок из базы данных
    // Пока возвращаем пустые данные
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
  } catch (error) {
    console.error('Ошибка при получении социальных ссылок:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    // Получаем данные из тела запроса
    const body = await request.json();
    const { userId, links } = body;
    
    if (!userId || !links) {
      return NextResponse.json(
        { error: 'Отсутствуют необходимые данные' },
        { status: 400 }
      );
    }
    
    // Здесь должна быть логика сохранения социальных ссылок в базе данных
    // Пока просто возвращаем успешный ответ
    return NextResponse.json({
      success: true,
      message: 'Социальные ссылки успешно сохранены'
    });
  } catch (error) {
    console.error('Ошибка при сохранении социальных ссылок:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
} 