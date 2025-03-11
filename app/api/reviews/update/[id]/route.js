import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

export async function PUT(request, { params }) {
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
    
    // Получение данных из запроса
    const data = await request.json();
    const { text, rating, categories } = data;
    
    // Проверка обязательных полей
    if (!text || !rating) {
      return NextResponse.json({ message: 'Отсутствуют обязательные поля' }, { status: 400 });
    }
    
    // Проверка существования отзыва и прав на его редактирование
    const existingReview = await prisma.review.findUnique({
      where: { id }
    });
    
    if (!existingReview) {
      return NextResponse.json({ message: 'Отзыв не найден' }, { status: 404 });
    }
    
    if (existingReview.reviewerId !== userData.id) {
      return NextResponse.json({ message: 'У вас нет прав на редактирование этого отзыва' }, { status: 403 });
    }
    
    // Обновление отзыва
    const updatedReview = await prisma.review.update({
      where: { id },
      data: {
        text,
        rating: parseInt(rating),
        categories: categories || [],
        updatedAt: new Date()
      }
    });
    
    // Обновление статистики отзывов для пользователя
    const targetUserId = existingReview.targetUserId;
    const allReviews = await prisma.review.findMany({
      where: { targetUserId }
    });
    
    const totalRating = allReviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = allReviews.length > 0 ? totalRating / allReviews.length : 0;
    
    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        averageRating
      }
    });
    
    // Анализ категорий для создания тир-листа
    if (categories && categories.length > 0) {
      const categoryStats = {};
      
      // Собираем все отзывы с категориями
      allReviews.forEach(review => {
        if (review.categories && review.categories.length > 0) {
          review.categories.forEach(category => {
            if (!categoryStats[category]) {
              categoryStats[category] = 0;
            }
            categoryStats[category]++;
          });
        }
      });
      
      // Проверяем, есть ли категории с более чем 5 отзывами
      const popularCategories = Object.entries(categoryStats)
        .filter(([_, count]) => count >= 5)
        .map(([category]) => category);
      
      // Если есть популярные категории, создаем автоматический тир-лист
      if (popularCategories.length > 0) {
        // Проверяем, не создан ли уже тир-лист для этих категорий
        const existingTierlist = await prisma.tierlist.findFirst({
          where: {
            userId: targetUserId,
            title: { contains: popularCategories[0] }
          }
        });
        
        if (!existingTierlist) {
          await prisma.tierlist.create({
            data: {
              userId: targetUserId,
              title: `Топ стримеров по категориям: ${popularCategories.join(', ')}`,
              description: `Автоматически созданный тир-лист на основе отзывов в категориях: ${popularCategories.join(', ')}`,
              categories: popularCategories,
              isPublic: true
            }
          });
        }
      }
    }
    
    return NextResponse.json(updatedReview);
    
  } catch (error) {
    console.error('Ошибка при обновлении отзыва:', error);
    return NextResponse.json({ message: 'Внутренняя ошибка сервера' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 