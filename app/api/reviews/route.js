import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Временное хранилище данных (в реальном приложении будет база данных)
let mediaReviews = [];

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

// Функция для проверки, является ли пользователь стримером
function isStreamer(userId) {
  try {
    // В реальном приложении здесь будет запрос к базе данных
    // Пока просто проверяем, что ID пользователя существует
    return !!userId;
  } catch (error) {
    console.error('Error checking if user is streamer:', error);
    return false;
  }
}

// GET - получение отзывов
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const mediaId = url.searchParams.get('mediaId');
    const userId = url.searchParams.get('userId');
    
    // Фильтруем отзывы
    let filteredReviews = [...mediaReviews];
    
    if (mediaId) {
      filteredReviews = filteredReviews.filter(review => review.mediaId === mediaId);
    }
    
    if (userId) {
      filteredReviews = filteredReviews.filter(review => review.userId === userId);
    }
    
    return NextResponse.json(filteredReviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - добавление нового отзыва
export async function POST(request) {
  try {
    const userId = getUserIdFromCookies();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const data = await request.json();
    
    // Валидация данных
    if (!data.mediaId || !data.rating) {
      return NextResponse.json({ error: 'Media ID and rating are required' }, { status: 400 });
    }
    
    // Проверяем, существует ли уже отзыв от этого пользователя на это медиа
    const existingReviewIndex = mediaReviews.findIndex(
      review => review.mediaId === data.mediaId && review.userId === userId
    );
    
    // Определяем, является ли пользователь стримером
    const isUserStreamer = isStreamer(userId);
    
    if (existingReviewIndex !== -1) {
      // Обновляем существующий отзыв
      mediaReviews[existingReviewIndex] = {
        ...mediaReviews[existingReviewIndex],
        rating: data.rating,
        comment: data.comment || mediaReviews[existingReviewIndex].comment,
        updatedAt: new Date().toISOString()
      };
      
      return NextResponse.json(mediaReviews[existingReviewIndex]);
    } else {
      // Создаем новый отзыв
      const newReview = {
        id: Date.now().toString(),
        mediaId: data.mediaId,
        userId,
        isStreamer: isUserStreamer,
        rating: data.rating,
        comment: data.comment || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      mediaReviews.push(newReview);
      
      return NextResponse.json(newReview, { status: 201 });
    }
  } catch (error) {
    console.error('Error adding review:', error);
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
    const reviewIndex = mediaReviews.findIndex(review => review.id === data.id);
    if (reviewIndex === -1) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }
    
    // Проверяем, принадлежит ли отзыв пользователю
    if (mediaReviews[reviewIndex].userId !== userId) {
      return NextResponse.json({ error: 'You can only update your own reviews' }, { status: 403 });
    }
    
    // Обновляем отзыв
    mediaReviews[reviewIndex] = {
      ...mediaReviews[reviewIndex],
      rating: data.rating || mediaReviews[reviewIndex].rating,
      comment: data.comment !== undefined ? data.comment : mediaReviews[reviewIndex].comment,
      updatedAt: new Date().toISOString()
    };
    
    return NextResponse.json(mediaReviews[reviewIndex]);
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
    const reviewIndex = mediaReviews.findIndex(review => review.id === reviewId);
    if (reviewIndex === -1) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }
    
    // Проверяем, принадлежит ли отзыв пользователю
    if (mediaReviews[reviewIndex].userId !== userId) {
      return NextResponse.json({ error: 'You can only delete your own reviews' }, { status: 403 });
    }
    
    // Удаляем отзыв
    mediaReviews.splice(reviewIndex, 1);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting review:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 