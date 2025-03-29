import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
// Убираем импорты MongoDB
// import { connectToDatabase } from '../../../utils/mongodb';
// import { ObjectId } from 'mongodb';
// Добавляем импорт клиента Supabase
import { supabase } from '../../../utils/supabaseClient'; // Убедитесь, что путь правильный

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
    
    // Запрос к Supabase
    const { data: scheduledStreams, error } = await supabase
      .from('scheduled_streams')
      .select('*') // Выбираем все поля стрима
      // Если нужно получать голоса: .select('*, stream_votes(*)')
      .eq('user_id', userId) // Фильтр по user_id
      .order('scheduled_date', { ascending: true }); // Сортировка

    if (error) {
      console.error('Supabase GET scheduled_streams error:', error);
      throw error; // Передаем ошибку дальше
    }

    // Проверка на существование коллекции больше не нужна

    return NextResponse.json({
      success: true,
      scheduledStreams: scheduledStreams || [], // Возвращаем данные или пустой массив
    });
  } catch (error) {
    console.error('Ошибка при получении запланированных трансляций (Supabase):', error);
    // Используем message из ошибки Supabase, если есть
    const errorMessage = error.message || 'Произошла неизвестная ошибка. Пожалуйста, попробуйте позже.';
    return NextResponse.json({ 
      error: 'Ошибка сервера', 
      message: errorMessage,
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
    
    // Данные для вставки в Supabase
    const newStreamData = {
      user_id: userId,
      title,
      description: description || null, // Используем null для пустых необязательных полей
      scheduled_date: new Date(scheduledDate).toISOString(), // Преобразуем в ISO строку для Supabase
      duration: duration || 120,
      category: category || null,
      tags: tags || [],
      // Поле votes больше не нужно
      // created_at и updated_at обычно устанавливаются Supabase по умолчанию/триггерами
    };

    // Запрос на вставку в Supabase
    const { data: insertedStream, error } = await supabase
      .from('scheduled_streams')
      .insert(newStreamData)
      .select() // Возвращаем вставленные данные
      .single(); // Ожидаем один результат

    if (error) {
      console.error('Supabase POST scheduled_streams error:', error);
      throw error; 
    }
    
    // Проверка на существование коллекции больше не нужна

    return NextResponse.json({
      success: true,
      // Возвращаем ID из вставленных данных Supabase
      streamId: insertedStream.id, 
      scheduledStream: insertedStream // Возвращаем весь объект
    });
  } catch (error) {
    console.error('Ошибка при создании запланированной трансляции (Supabase):', error);
    const errorMessage = error.message || 'Произошла неизвестная ошибка.';
    return NextResponse.json({ 
      error: 'Ошибка сервера', 
      message: errorMessage,
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
    const { streamId, title, description, scheduledDate, duration, category, tags } = data;
    
    if (!streamId) {
      return NextResponse.json(
        { error: 'Отсутствует ID трансляции', success: false },
        { status: 400 }
      );
    }
    
    // Данные для обновления в Supabase
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description; // Позволяем установить null
    if (scheduledDate) updateData.scheduled_date = new Date(scheduledDate).toISOString();
    if (duration !== undefined) updateData.duration = duration;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = tags;
    // updated_at будет обновлен триггером в Supabase

    // Проверяем, есть ли что обновлять
    if (Object.keys(updateData).length === 0) {
         return NextResponse.json(
            { success: true, message: 'Нет данных для обновления' },
            { status: 200 }
         );
    }

    // Запрос на обновление в Supabase
    const { data: updatedStream, error } = await supabase
      .from('scheduled_streams')
      .update(updateData)
      .eq('id', streamId) // Фильтр по ID Supabase
      .select() // Опционально: вернуть обновленные данные
      .single();

    if (error) {
      console.error('Supabase PUT scheduled_streams error:', error);
      // Проверяем на ошибку "не найдено" (например, PGRST116 в PostgREST)
      if (error.code === 'PGRST116') { 
           return NextResponse.json({ error: 'Трансляция не найдена', success: false }, { status: 404 });
      }
      throw error;
    }

    // Если запись не найдена (несмотря на отсутствие ошибки PGRST116)
     if (!updatedStream) {
       return NextResponse.json(
         { error: 'Трансляция не найдена', success: false },
         { status: 404 }
       );
     }

    return NextResponse.json({
      success: true,
      message: 'Запланированная трансляция успешно обновлена',
      // scheduledStream: updatedStream // Можно вернуть обновленные данные
    });

  } catch (error) {
    console.error('Ошибка при обновлении запланированной трансляции (Supabase):', error);
    const errorMessage = error.message || 'Произошла неизвестная ошибка.';
    return NextResponse.json({ 
      error: 'Ошибка сервера', 
      message: errorMessage,
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
    
    if (!streamId) {
      return NextResponse.json(
        { error: 'Отсутствует ID трансляции', success: false },
        { status: 400 }
      );
    }
    
    // Запрос на удаление из Supabase
    const { error, count } = await supabase
      .from('scheduled_streams')
      .delete()
      .eq('id', streamId); // Фильтр по ID Supabase

    if (error) {
      console.error('Supabase DELETE scheduled_streams error:', error);
      throw error;
    }
    
    // Проверяем, была ли запись удалена
    if (count === 0) {
         return NextResponse.json(
           { error: 'Трансляция не найдена', success: false },
           { status: 404 }
         );
    }

    return NextResponse.json({
      success: true,
      message: 'Запланированная трансляция успешно удалена'
    });
  } catch (error) {
    console.error('Ошибка при удалении запланированной трансляции (Supabase):', error);
    const errorMessage = error.message || 'Произошла неизвестная ошибка.';
    return NextResponse.json({ 
      error: 'Ошибка сервера', 
      message: errorMessage,
      success: false
    }, { status: 500 });
  }
} 