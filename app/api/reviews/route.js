import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import prisma from '../../../../lib/prisma';

const prismaClient = new PrismaClient();

// Временное хранилище данных (в реальном приложении будет база данных)
let reviews = [];

// Функция для получения ID пользователя из куки
function getUserIdFromCookies() {
  try {
    const cookieStore = cookies();
    const userCookie = cookieStore.get('twitch_user')?.value;
    if (userCookie) {
      const userData = JSON.parse(userCookie);
      return userData.id;
    }
    return null;
  } catch (error) {
    console.error('Error getting user ID from cookies:', error);
    return null;
  }
}

// Функция для получения данных пользователя из куки
function getUserDataFromCookies() {
  try {
    const cookieStore = cookies();
    const userCookie = cookieStore.get('twitch_user')?.value;
    if (userCookie) {
      return JSON.parse(userCookie);
    }
    return null;
  } catch (error) {
    console.error('Error getting user data from cookies:', error);
    return null;
  }
}

// GET - получение отзывов
export async function GET(request) {
  try {
    // Получаем параметры из URL
    const { searchParams } = new URL(request.url);
    const streamerId = searchParams.get('streamerId');
    const authorId = searchParams.get('authorId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;
    
    // Формируем условия запроса
    const where = {};
    if (streamerId) where.streamerId = streamerId;
    if (authorId) where.authorId = authorId;
    
    // Получаем общее количество отзывов
    const totalReviews = await prisma.review.count({ where });
    
    // Получаем отзывы с пагинацией
    const reviews = await prisma.review.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true
          }
        },
        streamer: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });
    
    // Если запрашиваются отзывы для конкретного стримера, получаем статистику
    let stats = null;
    if (streamerId) {
      const allReviews = await prisma.review.findMany({
        where: { streamerId },
        select: { rating: true }
      });
      
      // Рассчитываем статистику
      const totalRating = allReviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = allReviews.length > 0 ? totalRating / allReviews.length : 0;
      
      // Рассчитываем распределение рейтингов
      const ratingDistribution = {
        1: 0, 2: 0, 3: 0, 4: 0, 5: 0
      };
      
      allReviews.forEach(review => {
        ratingDistribution[review.rating]++;
      });
      
      stats = {
        totalReviews: allReviews.length,
        averageRating,
        ratingDistribution
      };
    }
    
    // Формируем метаданные для пагинации
    const totalPages = Math.ceil(totalReviews / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    return NextResponse.json({
      reviews,
      stats,
      pagination: {
        totalReviews,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    console.error('Ошибка при получении отзывов:', error);
    return NextResponse.json({ message: 'Произошла ошибка при получении отзывов' }, { status: 500 });
  }
}

// POST - создание нового отзыва
export async function POST(request) {
  try {
    const userData = getUserDataFromCookies();
    if (!userData || !userData.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const data = await request.json();
    
    // Валидация данных
    if (!data.targetUserId || !data.text || !data.rating) {
      return NextResponse.json({ error: 'Target user ID, text and rating are required' }, { status: 400 });
    }
    
    // Проверяем, не оставлял ли пользователь уже отзыв для этого пользователя
    const existingReview = reviews.find(
      review => review.authorId === userData.id && review.targetUserId === data.targetUserId
    );
    
    if (existingReview) {
      return NextResponse.json({ error: 'You have already left a review for this user' }, { status: 400 });
    }
    
    // Создаем новый отзыв
    const newReview = {
      id: Date.now().toString(),
      authorId: userData.id,
      authorName: userData.display_name || userData.login,
      authorImage: userData.profile_image_url || '/default-avatar.png',
      targetUserId: data.targetUserId,
      text: data.text,
      rating: Math.min(Math.max(1, data.rating), 5), // Ограничиваем рейтинг от 1 до 5
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Добавляем в хранилище
    reviews.push(newReview);
    
    return NextResponse.json(newReview, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT - обновление отзыва
export async function PUT(request) {
  try {
    const userId = getUserIdFromCookies();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const data = await request.json();
    
    // Валидация данных
    if (!data.id) {
      return NextResponse.json({ error: 'Review ID is required' }, { status: 400 });
    }
    
    // Находим отзыв
    const reviewIndex = reviews.findIndex(review => review.id === data.id);
    if (reviewIndex === -1) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }
    
    // Проверяем, принадлежит ли отзыв пользователю
    if (reviews[reviewIndex].authorId !== userId) {
      return NextResponse.json({ error: 'You can only update your own reviews' }, { status: 403 });
    }
    
    // Обновляем отзыв
    reviews[reviewIndex] = {
      ...reviews[reviewIndex],
      text: data.text || reviews[reviewIndex].text,
      rating: data.rating ? Math.min(Math.max(1, data.rating), 5) : reviews[reviewIndex].rating,
      updatedAt: new Date().toISOString()
    };
    
    return NextResponse.json(reviews[reviewIndex]);
  } catch (error) {
    console.error('Error updating review:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE - удаление отзыва
export async function DELETE(request) {
  try {
    const userId = getUserIdFromCookies();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const url = new URL(request.url);
    const reviewId = url.searchParams.get('id');
    
    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID is required' }, { status: 400 });
    }
    
    // Находим отзыв
    const reviewIndex = reviews.findIndex(review => review.id === reviewId);
    if (reviewIndex === -1) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }
    
    // Проверяем, принадлежит ли отзыв пользователю
    if (reviews[reviewIndex].authorId !== userId) {
      return NextResponse.json({ error: 'You can only delete your own reviews' }, { status: 403 });
    }
    
    // Удаляем отзыв
    reviews.splice(reviewIndex, 1);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting review:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 