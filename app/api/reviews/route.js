import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ message: 'ID пользователя не указан' }, { status: 400 });
    }
    
    // Получение всех отзывов для указанного пользователя
    const reviews = await prisma.review.findMany({
      where: {
        targetUserId: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Получение информации об авторах отзывов
    const reviewsWithAuthorInfo = await Promise.all(
      reviews.map(async (review) => {
        const author = await prisma.user.findUnique({
          where: { id: review.reviewerId },
          select: {
            id: true,
            login: true,
            display_name: true,
            profile_image_url: true
          }
        });
        
        return {
          id: review.id,
          text: review.text,
          rating: review.rating,
          categories: review.categories || [],
          createdAt: review.createdAt,
          updatedAt: review.updatedAt,
          reviewerId: review.reviewerId,
          targetUserId: review.targetUserId,
          authorName: author?.display_name || author?.login || review.authorName || 'Неизвестный пользователь',
          authorImage: author?.profile_image_url || review.authorImage || '/images/default-avatar.png'
        };
      })
    );
    
    return NextResponse.json(reviewsWithAuthorInfo);
    
  } catch (error) {
    console.error('Ошибка при получении отзывов:', error);
    return NextResponse.json({ message: 'Внутренняя ошибка сервера' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
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