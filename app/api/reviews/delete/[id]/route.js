import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

export async function DELETE(request, { params }) {
  try {
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
    
    // Проверка существования отзыва и прав на его удаление
    const existingReview = await prisma.review.findUnique({
      where: { id }
    });
    
    if (!existingReview) {
      return NextResponse.json({ message: 'Отзыв не найден' }, { status: 404 });
    }
    
    if (existingReview.reviewerId !== userData.id) {
      return NextResponse.json({ message: 'У вас нет прав на удаление этого отзыва' }, { status: 403 });
    }
    
    // Сохраняем ID пользователя, которому был оставлен отзыв, для обновления статистики
    const targetUserId = existingReview.targetUserId;
    
    // Удаление отзыва
    await prisma.review.delete({
      where: { id }
    });
    
    // Обновление статистики отзывов для пользователя
    const allReviews = await prisma.review.findMany({
      where: { targetUserId }
    });
    
    const totalRating = allReviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = allReviews.length > 0 ? totalRating / allReviews.length : 0;
    
    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        reviewCount: allReviews.length,
        averageRating
      }
    });
    
    return NextResponse.json({ message: 'Отзыв успешно удален' });
    
  } catch (error) {
    console.error('Ошибка при удалении отзыва:', error);
    return NextResponse.json({ message: 'Внутренняя ошибка сервера' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 