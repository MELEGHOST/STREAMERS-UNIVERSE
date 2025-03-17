import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '../../../utils/mongodb';

// Получение запланированных трансляций
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Отсутствует userId', success: false },
        { status: 400 }
      );
    }
    
    // Подключаемся к базе данных
    const { db } = await connectToDatabase();
    
    // Получаем запланированные трансляции пользователя
    const scheduledStreams = await db
      .collection('scheduled_streams')
      .find({ userId })
      .sort({ scheduledDate: 1 }) // Сортировка по дате (ближайшие сначала)
      .toArray();
    
    return NextResponse.json({
      success: true,
      scheduledStreams
    });
  } catch (error) {
    console.error('Ошибка при получении запланированных трансляций:', error);
    return NextResponse.json({ 
      error: 'Ошибка сервера', 
      message: error.message || 'Произошла неизвестная ошибка. Пожалуйста, попробуйте позже.',
      success: false
    }, { status: 500 });
  }
}

// Создание новой запланированной трансляции
export async function POST(request) {
  try {
    // Получаем токен доступа из cookies
    const cookieStore = cookies();
    let accessToken = cookieStore.get('twitch_access_token')?.value;
    
    if (!accessToken) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7);
      }
    }
    
    // Проверяем, что токен существует
    if (!accessToken) {
      return NextResponse.json({ 
        error: 'Не авторизован', 
        message: 'Токен доступа не найден или недействителен. Пожалуйста, войдите снова.',
        success: false
      }, { status: 401 });
    }
    
    // Получаем данные из запроса
    const data = await request.json();
    const { userId, title, description, scheduledDate, duration, category, tags } = data;
    
    if (!userId || !title || !scheduledDate) {
      return NextResponse.json(
        { error: 'Отсутствуют обязательные поля', success: false },
        { status: 400 }
      );
    }
    
    // Подключаемся к базе данных
    const { db } = await connectToDatabase();
    
    // Создаем новую запланированную трансляцию
    const newStream = {
      userId,
      title,
      description: description || '',
      scheduledDate: new Date(scheduledDate),
      duration: duration || 120, // По умолчанию 2 часа
      category: category || '',
      tags: tags || [],
      votes: [], // Голоса пользователей
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('scheduled_streams').insertOne(newStream);
    
    return NextResponse.json({
      success: true,
      streamId: result.insertedId,
      scheduledStream: {
        ...newStream,
        _id: result.insertedId
      }
    });
  } catch (error) {
    console.error('Ошибка при создании запланированной трансляции:', error);
    return NextResponse.json({ 
      error: 'Ошибка сервера', 
      message: error.message || 'Произошла неизвестная ошибка. Пожалуйста, попробуйте позже.',
      success: false
    }, { status: 500 });
  }
}

// Обновление запланированной трансляции
export async function PUT(request) {
  try {
    // Получаем токен доступа из cookies
    const cookieStore = cookies();
    let accessToken = cookieStore.get('twitch_access_token')?.value;
    
    if (!accessToken) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7);
      }
    }
    
    // Проверяем, что токен существует
    if (!accessToken) {
      return NextResponse.json({ 
        error: 'Не авторизован', 
        message: 'Токен доступа не найден или недействителен. Пожалуйста, войдите снова.',
        success: false
      }, { status: 401 });
    }
    
    // Получаем данные из запроса
    const data = await request.json();
    const { streamId, userId, title, description, scheduledDate, duration, category, tags } = data;
    
    if (!streamId || !userId) {
      return NextResponse.json(
        { error: 'Отсутствуют обязательные поля', success: false },
        { status: 400 }
      );
    }
    
    // Подключаемся к базе данных
    const { db } = await connectToDatabase();
    
    // Проверяем, существует ли трансляция и принадлежит ли она пользователю
    const existingStream = await db.collection('scheduled_streams').findOne({ 
      _id: { $eq: streamId },
      userId: { $eq: userId }
    });
    
    if (!existingStream) {
      return NextResponse.json(
        { error: 'Трансляция не найдена или у вас нет прав на ее редактирование', success: false },
        { status: 404 }
      );
    }
    
    // Обновляем данные трансляции
    const updateData = {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(scheduledDate && { scheduledDate: new Date(scheduledDate) }),
      ...(duration && { duration }),
      ...(category !== undefined && { category }),
      ...(tags && { tags }),
      updatedAt: new Date()
    };
    
    await db.collection('scheduled_streams').updateOne(
      { _id: streamId },
      { $set: updateData }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Запланированная трансляция успешно обновлена'
    });
  } catch (error) {
    console.error('Ошибка при обновлении запланированной трансляции:', error);
    return NextResponse.json({ 
      error: 'Ошибка сервера', 
      message: error.message || 'Произошла неизвестная ошибка. Пожалуйста, попробуйте позже.',
      success: false
    }, { status: 500 });
  }
}

// Удаление запланированной трансляции
export async function DELETE(request) {
  try {
    // Получаем токен доступа из cookies
    const cookieStore = cookies();
    let accessToken = cookieStore.get('twitch_access_token')?.value;
    
    if (!accessToken) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7);
      }
    }
    
    // Проверяем, что токен существует
    if (!accessToken) {
      return NextResponse.json({ 
        error: 'Не авторизован', 
        message: 'Токен доступа не найден или недействителен. Пожалуйста, войдите снова.',
        success: false
      }, { status: 401 });
    }
    
    // Получаем параметры запроса
    const { searchParams } = new URL(request.url);
    const streamId = searchParams.get('streamId');
    const userId = searchParams.get('userId');
    
    if (!streamId || !userId) {
      return NextResponse.json(
        { error: 'Отсутствуют обязательные параметры', success: false },
        { status: 400 }
      );
    }
    
    // Подключаемся к базе данных
    const { db } = await connectToDatabase();
    
    // Проверяем, существует ли трансляция и принадлежит ли она пользователю
    const existingStream = await db.collection('scheduled_streams').findOne({ 
      _id: { $eq: streamId },
      userId: { $eq: userId }
    });
    
    if (!existingStream) {
      return NextResponse.json(
        { error: 'Трансляция не найдена или у вас нет прав на ее удаление', success: false },
        { status: 404 }
      );
    }
    
    // Удаляем трансляцию
    await db.collection('scheduled_streams').deleteOne({ _id: streamId });
    
    return NextResponse.json({
      success: true,
      message: 'Запланированная трансляция успешно удалена'
    });
  } catch (error) {
    console.error('Ошибка при удалении запланированной трансляции:', error);
    return NextResponse.json({ 
      error: 'Ошибка сервера', 
      message: error.message || 'Произошла неизвестная ошибка. Пожалуйста, попробуйте позже.',
      success: false
    }, { status: 500 });
  }
} 