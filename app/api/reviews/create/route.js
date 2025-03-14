import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { verifyToken } from '../../../../lib/auth';

export async function POST(request) {
  try {
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
    const { content, rating, streamerId, categories } = await request.json();
    
    // Проверяем наличие обязательных полей
    if (!content || !rating || !streamerId) {
      return NextResponse.json({ message: 'Отсутствуют обязательные поля' }, { status: 400 });
    }
    
    // Проверяем, что рейтинг находится в допустимом диапазоне
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ message: 'Рейтинг должен быть от 1 до 5' }, { status: 400 });
    }
    
    // Проверяем, что пользователь не оставляет отзыв самому себе
    if (userData.id === streamerId) {
      return NextResponse.json({ message: 'Нельзя оставить отзыв самому себе' }, { status: 400 });
    }
    
    // Проверяем, существует ли стример
    const streamer = await prisma.user.findUnique({
      where: { id: streamerId }
    });
    
    if (!streamer) {
      return NextResponse.json({ message: 'Стример не найден' }, { status: 404 });
    }
    
    // Проверяем, не оставлял ли пользователь уже отзыв этому стримеру
    const existingReview = await prisma.review.findFirst({
      where: {
        authorId: userData.id,
        streamerId: streamerId
      }
    });
    
    if (existingReview) {
      return NextResponse.json({ message: 'Вы уже оставили отзыв этому стримеру' }, { status: 400 });
    }
    
    // Создаем отзыв
    const review = await prisma.review.create({
      data: {
        content,
        rating,
        authorId: userData.id,
        streamerId,
        categories: categories || []
      }
    });
    
    // Начисляем StreamCoins за отзыв
    await prisma.user.update({
      where: { id: userData.id },
      data: {
        streamCoins: {
          increment: 10 // Начисляем 10 монет за отзыв
        }
      }
    });
    
    // Создаем запись о транзакции
    await prisma.streamCoinsTransaction.create({
      data: {
        userId: userData.id,
        amount: 10,
        type: 'EARN',
        description: 'Начисление за написание отзыва'
      }
    });
    
    return NextResponse.json({ 
      message: 'Отзыв успешно создан',
      review,
      coinsEarned: 10
    }, { status: 201 });
  } catch (error) {
    console.error('Ошибка при создании отзыва:', error);
    return NextResponse.json({ message: 'Произошла ошибка при создании отзыва' }, { status: 500 });
  }
} 