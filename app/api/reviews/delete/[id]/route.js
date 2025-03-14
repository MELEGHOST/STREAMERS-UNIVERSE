import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { verifyToken } from '../../../lib/auth';

export async function DELETE(request, { params }) {
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
    
    // Находим отзыв
    const review = await prisma.review.findUnique({
      where: { id }
    });
    
    if (!review) {
      return NextResponse.json({ message: 'Отзыв не найден' }, { status: 404 });
    }
    
    // Проверяем, является ли пользователь автором отзыва
    if (review.authorId !== userData.id) {
      return NextResponse.json({ message: 'У вас нет прав на удаление этого отзыва' }, { status: 403 });
    }
    
    // Удаляем отзыв
    await prisma.review.delete({
      where: { id }
    });
    
    // Вычитаем StreamCoins за удаление отзыва
    await prisma.user.update({
      where: { id: userData.id },
      data: {
        streamCoins: {
          decrement: 5 // Вычитаем 5 монет за удаление отзыва
        }
      }
    });
    
    // Создаем запись о транзакции
    await prisma.streamCoinsTransaction.create({
      data: {
        userId: userData.id,
        amount: 5,
        type: 'SPEND',
        description: 'Списание за удаление отзыва'
      }
    });
    
    return NextResponse.json({ 
      message: 'Отзыв успешно удален',
      coinsSpent: 5
    });
  } catch (error) {
    console.error('Ошибка при удалении отзыва:', error);
    return NextResponse.json({ message: 'Произошла ошибка при удалении отзыва' }, { status: 500 });
  }
} 