import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

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
    const url = new URL(request.url);
    const tierlistId = url.searchParams.get('id');
    const userId = url.searchParams.get('userId');
    const category = url.searchParams.get('category');
    
    // Если указан ID тирлиста, возвращаем конкретный тирлист с его элементами
    if (tierlistId) {
      const tierlist = tierlists.find(item => item.id === tierlistId);
      if (!tierlist) {
        return NextResponse.json({ error: 'Tierlist not found' }, { status: 404 });
      }
      
      // Получаем элементы для этого тирлиста
      const items = tierlistItems.filter(item => item.tierlistId === tierlistId);
      
      return NextResponse.json({
        ...tierlist,
        items
      });
    }
    
    // Фильтруем тирлисты
    let filteredTierlists = [...tierlists];
    
    if (userId) {
      filteredTierlists = filteredTierlists.filter(tierlist => tierlist.userId === userId);
    }
    
    if (category) {
      filteredTierlists = filteredTierlists.filter(tierlist => tierlist.category === category);
    }
    
    // Для каждого тирлиста добавляем количество элементов
    const tierlitsWithItemCount = filteredTierlists.map(tierlist => {
      const itemCount = tierlistItems.filter(item => item.tierlistId === tierlist.id).length;
      return {
        ...tierlist,
        itemCount
      };
    });
    
    return NextResponse.json(tierlitsWithItemCount);
  } catch (error) {
    console.error('Error fetching tierlists:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - создание нового тирлиста
export async function POST(request) {
  try {
    const userId = getUserIdFromCookies();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Проверяем, является ли пользователь стримером
    if (!isStreamer(userId)) {
      return NextResponse.json({ error: 'Only streamers can create tierlists' }, { status: 403 });
    }
    
    const data = await request.json();
    
    // Валидация данных
    if (!data.title || !data.category) {
      return NextResponse.json({ error: 'Title and category are required' }, { status: 400 });
    }
    
    // Создаем новый тирлист
    const newTierlist = {
      id: Date.now().toString(),
      userId,
      title: data.title,
      category: data.category,
      description: data.description || '',
      tiers: data.tiers || ['S', 'A', 'B', 'C', 'D', 'F'],
      isPublic: data.isPublic !== undefined ? data.isPublic : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Добавляем в хранилище
    tierlists.push(newTierlist);
    
    // Если указаны элементы, добавляем их
    if (data.items && Array.isArray(data.items)) {
      const newItems = data.items.map((item, index) => ({
        id: `${newTierlist.id}_${index}`,
        tierlistId: newTierlist.id,
        mediaId: item.mediaId,
        tier: item.tier,
        position: index,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      
      tierlistItems.push(...newItems);
      
      return NextResponse.json({
        ...newTierlist,
        items: newItems
      }, { status: 201 });
    }
    
    return NextResponse.json(newTierlist, { status: 201 });
  } catch (error) {
    console.error('Error creating tierlist:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
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