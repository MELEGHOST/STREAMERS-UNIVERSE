import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '../../../utils/mongodb';
import { ObjectId } from 'mongodb';

// Голосование за запланированную трансляцию
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
    const { streamId, userId, voterId, voterName, preferredDate, comment } = data;
    
    if (!streamId || !userId || !voterId) {
      return NextResponse.json(
        { error: 'Отсутствуют обязательные поля', success: false },
        { status: 400 }
      );
    }
    
    // Подключаемся к базе данных
    const { db } = await connectToDatabase();
    
    // Проверяем, существует ли трансляция
    const existingStream = await db.collection('scheduled_streams').findOne({ 
      _id: new ObjectId(streamId)
    });
    
    if (!existingStream) {
      return NextResponse.json(
        { error: 'Трансляция не найдена', success: false },
        { status: 404 }
      );
    }
    
    // Проверяем, не голосовал ли пользователь уже
    const existingVote = existingStream.votes.find(vote => vote.voterId === voterId);
    
    if (existingVote) {
      // Обновляем существующий голос
      await db.collection('scheduled_streams').updateOne(
        { 
          _id: new ObjectId(streamId),
          'votes.voterId': voterId
        },
        { 
          $set: { 
            'votes.$.preferredDate': preferredDate ? new Date(preferredDate) : null,
            'votes.$.comment': comment || '',
            'votes.$.updatedAt': new Date()
          } 
        }
      );
      
      return NextResponse.json({
        success: true,
        message: 'Ваш голос успешно обновлен'
      });
    } else {
      // Добавляем новый голос
      const newVote = {
        voterId,
        voterName: voterName || 'Аноним',
        preferredDate: preferredDate ? new Date(preferredDate) : null,
        comment: comment || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await db.collection('scheduled_streams').updateOne(
        { _id: new ObjectId(streamId) },
        { $push: { votes: newVote } }
      );
      
      return NextResponse.json({
        success: true,
        message: 'Ваш голос успешно добавлен'
      });
    }
  } catch (error) {
    console.error('Ошибка при голосовании за трансляцию:', error);
    return NextResponse.json({ 
      error: 'Ошибка сервера', 
      message: error.message || 'Произошла неизвестная ошибка. Пожалуйста, попробуйте позже.',
      success: false
    }, { status: 500 });
  }
}

// Удаление голоса
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
    const voterId = searchParams.get('voterId');
    
    if (!streamId || !voterId) {
      return NextResponse.json(
        { error: 'Отсутствуют обязательные параметры', success: false },
        { status: 400 }
      );
    }
    
    // Подключаемся к базе данных
    const { db } = await connectToDatabase();
    
    // Удаляем голос пользователя
    await db.collection('scheduled_streams').updateOne(
      { _id: new ObjectId(streamId) },
      { $pull: { votes: { voterId } } }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Голос успешно удален'
    });
  } catch (error) {
    console.error('Ошибка при удалении голоса:', error);
    return NextResponse.json({ 
      error: 'Ошибка сервера', 
      message: error.message || 'Произошла неизвестная ошибка. Пожалуйста, попробуйте позже.',
      success: false
    }, { status: 500 });
  }
} 