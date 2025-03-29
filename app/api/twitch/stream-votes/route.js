import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
// Убираем импорты MongoDB
// import { connectToDatabase } from '../../../utils/mongodb';
// import { ObjectId } from 'mongodb';
// Добавляем импорт клиента Supabase
import { supabase } from '../../../utils/supabaseClient'; // Убедитесь, что путь правильный

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
    const { streamId, userId, userName, preferredDate, comment } = data;
    
    if (!streamId || !userId || !userName || !preferredDate) {
      return NextResponse.json(
        { error: 'Отсутствуют обязательные поля (streamId, userId, userName, preferredDate)', success: false },
        { status: 400 }
      );
    }
    
    // Данные для вставки/обновления в Supabase
    const voteData = {
      stream_id: streamId, // Используем streamId из запроса
      user_id: userId,
      user_name: userName,
      preferred_date: new Date(preferredDate).toISOString(), // Преобразуем в ISO строку
      comment: comment || null, // Используем null, если комментарий пуст
      // created_at и updated_at будут управляться Supabase
    };

    // Используем upsert: вставляет новую строку или обновляет существующую
    // на основе уникального ключа (предполагается, что у вас есть UNIQUE constraint 
    // на (stream_id, user_id) в таблице stream_votes)
    const { data: upsertedVote, error } = await supabase
      .from('stream_votes')
      .upsert(voteData, { 
        // Указываем колонки для проверки конфликта (уникальный ключ)
        onConflict: 'stream_id, user_id', 
        // Если вы хотите возвращать старые данные при конфликте
        // ignoreDuplicates: false, 
      })
      .select() // Возвращаем вставленные/обновленные данные
      .single(); // Ожидаем один результат

    if (error) {
      console.error('Supabase POST/upsert stream_votes error:', error);
      // Проверяем, связана ли ошибка с внешним ключом (stream_id не существует)
      if (error.code === '23503') { // Код ошибки PostgreSQL для foreign key violation
           return NextResponse.json({ 
               error: 'Запланированная трансляция не найдена', 
               message: `Трансляция с ID ${streamId} не существует.`, 
               success: false 
           }, { status: 404 });
      }
      throw error; 
    }

    return NextResponse.json({
      success: true,
      message: 'Голос успешно добавлен или обновлен',
      vote: upsertedVote,
    });

  } catch (error) {
    console.error('Ошибка при добавлении/обновлении голоса (Supabase):', error);
    const errorMessage = error.message || 'Произошла неизвестная ошибка.';
    return NextResponse.json({ 
      error: 'Ошибка сервера', 
      message: errorMessage,
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
    const userId = searchParams.get('userId');
    
    if (!streamId || !userId) {
      return NextResponse.json(
        { error: 'Отсутствуют обязательные параметры (streamId, userId)', success: false },
        { status: 400 }
      );
    }
    
    // Запрос на удаление голоса из Supabase
    const { error, count } = await supabase
      .from('stream_votes')
      .delete()
      .match({ stream_id: streamId, user_id: userId }); // Условие для удаления конкретного голоса

    if (error) {
      console.error('Supabase DELETE stream_votes error:', error);
      throw error;
    }

    // Проверяем, была ли запись удалена
    if (count === 0) {
         return NextResponse.json(
           { error: 'Голос не найден', message: 'Голос этого пользователя для данной трансляции не найден.', success: false },
           { status: 404 }
         );
    }

    return NextResponse.json({
      success: true,
      message: 'Голос успешно удален'
    });

  } catch (error) {
    console.error('Ошибка при удалении голоса (Supabase):', error);
    const errorMessage = error.message || 'Произошла неизвестная ошибка.';
    return NextResponse.json({ 
      error: 'Ошибка сервера', 
      message: errorMessage,
      success: false
    }, { status: 500 });
  }
} 