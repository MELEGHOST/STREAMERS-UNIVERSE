import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { verifyToken } from '../../../../lib/auth';

export async function PUT(request, { params }) {
  try {
    // Получаем ID отзыва из параметров
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ message: 'ID отзыва не указан' }, { status: 400 });
    }
    
    // Проверка авторизации
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Отсутствует токен авторизации' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const userData = await verifyToken(token);
    
    if (!userData || !userData.id) {
      return NextResponse.json({ message: 'Недействительный токен' }, { status: 401 });
    }
    
    // Получаем данные из запроса
    const { content, rating, categories } = await request.json();
    
    // Проверяем наличие обязательных полей
    if (!content && !rating && !categories) {
      return NextResponse.json({ message: 'Не указаны поля для обновления' }, { status: 400 });
    }
    
    // Проверяем, что рейтинг находится в допустимом диапазоне
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json({ message: 'Рейтинг должен быть от 1 до 5' }, { status: 400 });
    }
    
    // Находим отзыв
    const review = await prisma.review.findUnique({
      where: { id }
    });
    
    if (!review) {
      return NextResponse.json({ message: 'Отзыв не найден' }, { status: 404 });
    }
    
    // Проверяем, является ли пользователь автором отзыва
    if (review.authorId !== userData.id) {
      return NextResponse.json({ message: 'У вас нет прав на редактирование этого отзыва' }, { status: 403 });
    }
    
    // Подготавливаем данные для обновления
    const updateData = {};
    if (content !== undefined) updateData.content = content;
    if (rating !== undefined) updateData.rating = rating;
    if (categories !== undefined) updateData.categories = categories;
    
    // Обновляем отзыв
    const updatedReview = await prisma.review.update({
      where: { id },
      data: updateData
    });
    
    return NextResponse.json({ 
      message: 'Отзыв успешно обновлен',
      review: updatedReview
    });
  } catch (error) {
    console.error('Ошибка при обновлении отзыва:', error);
    return NextResponse.json({ message: 'Произошла ошибка при обновлении отзыва' }, { status: 500 });
  }
} 