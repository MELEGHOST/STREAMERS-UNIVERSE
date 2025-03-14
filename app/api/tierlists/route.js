import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../../../lib/auth';

const prisma = new PrismaClient();

// Временное хранилище данных (в реальном приложении будет база данных)
let tierlists = [];
let tierlistItems = [];

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

// GET - получение тирлистов
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    let whereClause = {};
    
    if (userId) {
      whereClause.userId = userId;
    }
    
    // По умолчанию показываем только публичные тир-листы
    whereClause.isPublic = true;
    
    // Если пользователь авторизован, показываем также его приватные тир-листы
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const userData = await verifyToken(token);
        if (userData && userData.id) {
          if (userId === userData.id) {
            // Если запрашиваются тир-листы текущего пользователя, показываем все
            delete whereClause.isPublic;
          } else {
            // Иначе показываем публичные и те, где пользователь является создателем
            whereClause = {
              OR: [
                { isPublic: true },
                { createdBy: userData.id }
              ],
              ...(userId ? { userId } : {})
            };
          }
        }
      } catch (error) {
        console.error('Ошибка проверки токена:', error);
      }
    }
    
    const tierlists = await prisma.tierlist.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            id: true,
            login: true,
            display_name: true,
            profile_image_url: true
          }
        }
      }
    });
    
    return NextResponse.json(tierlists);
    
  } catch (error) {
    console.error('Ошибка при получении тир-листов:', error);
    return NextResponse.json({ message: 'Внутренняя ошибка сервера' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// POST - создание нового тирлиста
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
    
    // Получение данных из запроса
    const data = await request.json();
    const { userId, title, description, categories, isPublic } = data;
    
    // Проверка обязательных полей
    if (!userId || !title || !categories || !Array.isArray(categories)) {
      return NextResponse.json({ message: 'Отсутствуют обязательные поля' }, { status: 400 });
    }
    
    // Проверка прав на создание тир-листа
    // Пользователь может создать тир-лист для себя или для другого пользователя, если у него есть права
    if (userId !== userData.id) {
      // Здесь можно добавить проверку прав, если нужно
      // Например, проверить, является ли пользователь модератором
    }
    
    // Создание тир-листа
    const tierlist = await prisma.tierlist.create({
      data: {
        userId,
        title,
        description: description || '',
        categories,
        isPublic: isPublic === undefined ? true : isPublic,
        createdBy: userData.id
      }
    });
    
    // Если тир-лист создан на основе отзывов, добавляем стримеров в тир-лист
    if (categories && categories.length > 0) {
      // Получаем всех стримеров, у которых есть отзывы с указанными категориями
      const reviews = await prisma.review.findMany({
        where: {
          categories: {
            hasSome: categories
          }
        },
        include: {
          targetUser: {
            select: {
              id: true,
              login: true,
              display_name: true,
              profile_image_url: true,
              averageRating: true
            }
          }
        }
      });
      
      // Группируем стримеров по среднему рейтингу
      const streamers = {};
      reviews.forEach(review => {
        if (review.targetUser) {
          const streamerId = review.targetUser.id;
          if (!streamers[streamerId]) {
            streamers[streamerId] = {
              ...review.targetUser,
              reviewCount: 0,
              totalRating: 0
            };
          }
          streamers[streamerId].reviewCount++;
          streamers[streamerId].totalRating += review.rating;
        }
      });
      
      // Вычисляем средний рейтинг для каждого стримера и сортируем
      const streamersList = Object.values(streamers)
        .map(streamer => ({
          ...streamer,
          averageRating: streamer.totalRating / streamer.reviewCount
        }))
        .filter(streamer => streamer.reviewCount >= 3) // Минимум 3 отзыва для включения в тир-лист
        .sort((a, b) => b.averageRating - a.averageRating);
      
      // Распределяем стримеров по тирам на основе рейтинга
      const tiers = {
        S: [],
        A: [],
        B: [],
        C: [],
        D: []
      };
      
      streamersList.forEach(streamer => {
        const rating = streamer.averageRating;
        if (rating >= 4.5) {
          tiers.S.push(streamer.id);
        } else if (rating >= 4.0) {
          tiers.A.push(streamer.id);
        } else if (rating >= 3.5) {
          tiers.B.push(streamer.id);
        } else if (rating >= 3.0) {
          tiers.C.push(streamer.id);
        } else {
          tiers.D.push(streamer.id);
        }
      });
      
      // Обновляем тир-лист с распределением стримеров
      await prisma.tierlist.update({
        where: { id: tierlist.id },
        data: {
          tiers: tiers
        }
      });
    }
    
    return NextResponse.json(tierlist, { status: 201 });
    
  } catch (error) {
    console.error('Ошибка при создании тир-листа:', error);
    return NextResponse.json({ message: 'Внутренняя ошибка сервера' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// PUT - обновление тирлиста
export async function PUT(request) {
  try {
    const userId = getUserIdFromCookies();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const data = await request.json();
    
    // Валидация данных
    if (!data.id) {
      return NextResponse.json({ error: 'Tierlist ID is required' }, { status: 400 });
    }
    
    // Находим тирлист
    const tierlistIndex = tierlists.findIndex(tierlist => tierlist.id === data.id);
    if (tierlistIndex === -1) {
      return NextResponse.json({ error: 'Tierlist not found' }, { status: 404 });
    }
    
    // Проверяем, принадлежит ли тирлист пользователю
    if (tierlists[tierlistIndex].userId !== userId) {
      return NextResponse.json({ error: 'You can only update your own tierlists' }, { status: 403 });
    }
    
    // Обновляем тирлист
    tierlists[tierlistIndex] = {
      ...tierlists[tierlistIndex],
      title: data.title || tierlists[tierlistIndex].title,
      category: data.category || tierlists[tierlistIndex].category,
      description: data.description !== undefined ? data.description : tierlists[tierlistIndex].description,
      tiers: data.tiers || tierlists[tierlistIndex].tiers,
      isPublic: data.isPublic !== undefined ? data.isPublic : tierlists[tierlistIndex].isPublic,
      updatedAt: new Date().toISOString()
    };
    
    // Если указаны элементы, обновляем их
    if (data.items && Array.isArray(data.items)) {
      // Удаляем старые элементы
      tierlistItems = tierlistItems.filter(item => item.tierlistId !== data.id);
      
      // Добавляем новые элементы
      const newItems = data.items.map((item, index) => ({
        id: `${data.id}_${index}`,
        tierlistId: data.id,
        mediaId: item.mediaId,
        tier: item.tier,
        position: index,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      
      tierlistItems.push(...newItems);
      
      return NextResponse.json({
        ...tierlists[tierlistIndex],
        items: newItems
      });
    }
    
    return NextResponse.json(tierlists[tierlistIndex]);
  } catch (error) {
    console.error('Error updating tierlist:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE - удаление тирлиста
export async function DELETE(request) {
  try {
    const userId = getUserIdFromCookies();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const url = new URL(request.url);
    const tierlistId = url.searchParams.get('id');
    
    if (!tierlistId) {
      return NextResponse.json({ error: 'Tierlist ID is required' }, { status: 400 });
    }
    
    // Находим тирлист
    const tierlistIndex = tierlists.findIndex(tierlist => tierlist.id === tierlistId);
    if (tierlistIndex === -1) {
      return NextResponse.json({ error: 'Tierlist not found' }, { status: 404 });
    }
    
    // Проверяем, принадлежит ли тирлист пользователю
    if (tierlists[tierlistIndex].userId !== userId) {
      return NextResponse.json({ error: 'You can only delete your own tierlists' }, { status: 403 });
    }
    
    // Удаляем тирлист
    tierlists.splice(tierlistIndex, 1);
    
    // Удаляем все элементы для этого тирлиста
    tierlistItems = tierlistItems.filter(item => item.tierlistId !== tierlistId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tierlist:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 