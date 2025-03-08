import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Временное хранилище данных (в реальном приложении будет база данных)
let mediaItems = [];
let mediaReviews = [];
let mediaTierlists = [];

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

// GET - получение списка медиа или конкретного медиа по ID
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const mediaId = url.searchParams.get('id');
    const streamerId = url.searchParams.get('streamerId');
    const category = url.searchParams.get('category');
    
    // Если указан ID медиа, возвращаем конкретное медиа
    if (mediaId) {
      const media = mediaItems.find(item => item.id === mediaId);
      if (!media) {
        return NextResponse.json({ error: 'Media not found' }, { status: 404 });
      }
      
      // Получаем отзывы для этого медиа
      const reviews = mediaReviews.filter(review => review.mediaId === mediaId);
      
      // Вычисляем среднюю оценку стримера и зрителей
      const streamerReviews = reviews.filter(review => review.isStreamer);
      const viewerReviews = reviews.filter(review => !review.isStreamer);
      
      const streamerRating = streamerReviews.length > 0 
        ? streamerReviews.reduce((sum, review) => sum + review.rating, 0) / streamerReviews.length 
        : 0;
        
      const viewerRating = viewerReviews.length > 0 
        ? viewerReviews.reduce((sum, review) => sum + review.rating, 0) / viewerReviews.length 
        : 0;
      
      // Вычисляем общую оценку (60% стример, 40% зрители)
      const overallRating = streamerRating > 0 && viewerRating > 0
        ? (streamerRating * 0.6) + (viewerRating * 0.4)
        : streamerRating > 0 ? streamerRating : viewerRating;
      
      return NextResponse.json({
        ...media,
        reviews,
        ratings: {
          streamer: streamerRating,
          viewers: viewerRating,
          overall: overallRating
        }
      });
    }
    
    // Если указан ID стримера, возвращаем медиа этого стримера
    if (streamerId) {
      const streamerMedia = mediaItems.filter(item => item.streamerId === streamerId);
      
      // Если указана категория, фильтруем по ней
      const filteredMedia = category 
        ? streamerMedia.filter(item => item.category === category)
        : streamerMedia;
      
      return NextResponse.json(filteredMedia);
    }
    
    // Иначе возвращаем все медиа
    return NextResponse.json(mediaItems);
  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - добавление нового медиа
export async function POST(request) {
  try {
    const userId = getUserIdFromCookies();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Проверяем, является ли пользователь стримером
    if (!isStreamer(userId)) {
      return NextResponse.json({ error: 'Only streamers can add media' }, { status: 403 });
    }
    
    const data = await request.json();
    
    // Валидация данных
    if (!data.title || !data.category) {
      return NextResponse.json({ error: 'Title and category are required' }, { status: 400 });
    }
    
    // Создаем новое медиа
    const newMedia = {
      id: Date.now().toString(),
      streamerId: userId,
      title: data.title,
      category: data.category,
      imageUrl: data.imageUrl || null,
      description: data.description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Добавляем в хранилище
    mediaItems.push(newMedia);
    
    // Если указана оценка, добавляем отзыв стримера
    if (data.rating) {
      const streamerReview = {
        id: Date.now().toString(),
        mediaId: newMedia.id,
        userId,
        isStreamer: true,
        rating: data.rating,
        comment: data.comment || '',
        createdAt: new Date().toISOString()
      };
      
      mediaReviews.push(streamerReview);
    }
    
    return NextResponse.json(newMedia, { status: 201 });
  } catch (error) {
    console.error('Error adding media:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT - обновление медиа
export async function PUT(request) {
  try {
    const userId = getUserIdFromCookies();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const data = await request.json();
    
    // Валидация данных
    if (!data.id) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    }
    
    // Находим медиа
    const mediaIndex = mediaItems.findIndex(item => item.id === data.id);
    if (mediaIndex === -1) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }
    
    // Проверяем, принадлежит ли медиа пользователю
    if (mediaItems[mediaIndex].streamerId !== userId) {
      return NextResponse.json({ error: 'You can only update your own media' }, { status: 403 });
    }
    
    // Обновляем медиа
    mediaItems[mediaIndex] = {
      ...mediaItems[mediaIndex],
      title: data.title || mediaItems[mediaIndex].title,
      category: data.category || mediaItems[mediaIndex].category,
      imageUrl: data.imageUrl !== undefined ? data.imageUrl : mediaItems[mediaIndex].imageUrl,
      description: data.description !== undefined ? data.description : mediaItems[mediaIndex].description,
      updatedAt: new Date().toISOString()
    };
    
    return NextResponse.json(mediaItems[mediaIndex]);
  } catch (error) {
    console.error('Error updating media:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE - удаление медиа
export async function DELETE(request) {
  try {
    const userId = getUserIdFromCookies();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const url = new URL(request.url);
    const mediaId = url.searchParams.get('id');
    
    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    }
    
    // Находим медиа
    const mediaIndex = mediaItems.findIndex(item => item.id === mediaId);
    if (mediaIndex === -1) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }
    
    // Проверяем, принадлежит ли медиа пользователю
    if (mediaItems[mediaIndex].streamerId !== userId) {
      return NextResponse.json({ error: 'You can only delete your own media' }, { status: 403 });
    }
    
    // Удаляем медиа
    mediaItems.splice(mediaIndex, 1);
    
    // Удаляем все отзывы для этого медиа
    mediaReviews = mediaReviews.filter(review => review.mediaId !== mediaId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 