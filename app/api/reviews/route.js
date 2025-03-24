import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    console.error('Ошибка при получении ID пользователя из куки:', error);
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
    console.error('Ошибка при получении данных пользователя из куки:', error);
    return null;
  }
}

// Обработчик GET-запросов для получения отзывов
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Получаем параметры запроса
    const authorId = searchParams.get('authorId'); // ID автора отзыва (если нужны отзывы, сделанные пользователем)
    const targetId = searchParams.get('targetId'); // ID целевого стримера/объекта (если нужны отзывы о стримере)
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    
    // Создаем supabase клиент
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Формируем запрос в зависимости от переданных параметров
    let query = supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);
    
    // Применяем фильтры в зависимости от переданных параметров
    if (authorId) {
      // Если передан ID автора, получаем отзывы, сделанные пользователем
      query = query.eq('author_id', authorId);
    } else if (targetId) {
      // Если передан ID цели, получаем отзывы о стримере/объекте
      query = query.eq('target_id', targetId);
    }
    
    // Выполняем запрос к базе данных
    const { data: reviews, error, count } = await query;
    
    if (error) {
      console.error('Ошибка при получении отзывов:', error);
      return NextResponse.json(
        { error: 'Не удалось получить отзывы' },
        { status: 500 }
      );
    }
    
    // Преобразуем данные для клиента
    const formattedReviews = reviews.map(review => ({
      id: review.id,
      content: review.content,
      rating: review.rating,
      authorId: review.author_id,
      targetId: review.target_id,
      targetName: review.target_name,
      targetType: review.target_type,
      createdAt: review.created_at,
      updatedAt: review.updated_at
    }));
    
    // Для совместимости с фронтендом возвращаем объект с полями reviews и pagination
    return NextResponse.json({
      reviews: formattedReviews,
      pagination: {
        totalReviews: count || formattedReviews.length,
        currentPage: page,
        totalPages: Math.ceil((count || formattedReviews.length) / limit),
        limit,
        hasNextPage: (count || formattedReviews.length) > offset + limit,
        hasPrevPage: page > 1
      }
    });
    
  } catch (error) {
    console.error('Внутренняя ошибка сервера:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// Обработчик POST-запросов для создания новых отзывов
export async function POST(request) {
  try {
    // Получаем данные текущего пользователя для проверки авторизации
    const userData = getUserDataFromCookies();
    
    if (!userData || !userData.id) {
      return NextResponse.json(
        { error: 'Необходима авторизация для создания отзыва' },
        { status: 401 }
      );
    }
    
    // Парсим данные из тела запроса
    const requestData = await request.json();
    const { authorId, content, rating, targetName, targetId, targetType = 'other' } = requestData;
    
    // Проверяем, что ID автора соответствует текущему пользователю
    if (authorId !== userData.id) {
      return NextResponse.json(
        { error: 'Нельзя создавать отзывы от имени другого пользователя' },
        { status: 403 }
      );
    }
    
    // Валидация данных
    if (!authorId || !content || !rating || !targetName) {
      return NextResponse.json(
        { error: 'Отсутствуют обязательные поля' },
        { status: 400 }
      );
    }
    
    // Создаем supabase клиент
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Подготавливаем данные для вставки
    const reviewData = {
      author_id: authorId,
      content,
      rating,
      target_name: targetName,
      target_type: targetType,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Если указан ID цели (например, ID стримера)
    if (targetId) {
      reviewData.target_id = targetId;
    }
    
    // Вставляем отзыв в базу данных
    const { data: review, error } = await supabase
      .from('reviews')
      .insert(reviewData)
      .select()
      .single();
    
    if (error) {
      console.error('Ошибка при создании отзыва:', error);
      return NextResponse.json(
        { error: 'Не удалось создать отзыв' },
        { status: 500 }
      );
    }
    
    // Преобразуем данные для ответа
    const formattedReview = {
      id: review.id,
      content: review.content,
      rating: review.rating,
      authorId: review.author_id,
      targetId: review.target_id,
      targetName: review.target_name,
      targetType: review.target_type,
      createdAt: review.created_at,
      updatedAt: review.updated_at
    };
    
    return NextResponse.json(formattedReview, { status: 201 });
    
  } catch (error) {
    console.error('Внутренняя ошибка сервера:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// Обработчик PATCH-запросов для обновления отзывов
export async function PATCH(request) {
  try {
    // Получаем данные текущего пользователя для проверки авторизации
    const userData = getUserDataFromCookies();
    
    if (!userData || !userData.id) {
      return NextResponse.json(
        { error: 'Необходима авторизация для редактирования отзыва' },
        { status: 401 }
      );
    }
    
    // Парсим данные из тела запроса
    const { id, content, rating, authorId } = await request.json();
    
    // Проверяем, что ID автора соответствует текущему пользователю
    if (authorId !== userData.id) {
      return NextResponse.json(
        { error: 'Нельзя редактировать отзывы другого пользователя' },
        { status: 403 }
      );
    }
    
    // Валидация данных
    if (!id || !content || !rating) {
      return NextResponse.json(
        { error: 'Отсутствуют обязательные поля' },
        { status: 400 }
      );
    }
    
    // Создаем supabase клиент
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Проверяем, принадлежит ли отзыв пользователю
    const { data: existingReview, error: fetchError } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error('Ошибка при получении отзыва:', fetchError);
      return NextResponse.json(
        { error: 'Не удалось найти отзыв' },
        { status: 404 }
      );
    }
    
    if (existingReview.author_id !== userData.id) {
      return NextResponse.json(
        { error: 'У вас нет прав на редактирование этого отзыва' },
        { status: 403 }
      );
    }
    
    // Обновляем отзыв
    const { data: updatedReview, error } = await supabase
      .from('reviews')
      .update({
        content,
        rating,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Ошибка при обновлении отзыва:', error);
      return NextResponse.json(
        { error: 'Не удалось обновить отзыв' },
        { status: 500 }
      );
    }
    
    // Преобразуем данные
    const formattedReview = {
      id: updatedReview.id,
      content: updatedReview.content,
      rating: updatedReview.rating,
      authorId: updatedReview.author_id,
      targetId: updatedReview.target_id,
      targetName: updatedReview.target_name,
      targetType: updatedReview.target_type,
      createdAt: updatedReview.created_at,
      updatedAt: updatedReview.updated_at
    };
    
    return NextResponse.json(formattedReview);
    
  } catch (error) {
    console.error('Внутренняя ошибка сервера:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// Обработчик DELETE-запросов для удаления отзывов
export async function DELETE(request) {
  try {
    // Получаем данные текущего пользователя для проверки авторизации
    const userData = getUserDataFromCookies();
    
    if (!userData || !userData.id) {
      return NextResponse.json(
        { error: 'Необходима авторизация для удаления отзыва' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Отсутствует ID отзыва' },
        { status: 400 }
      );
    }
    
    // Создаем supabase клиент
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Проверяем, принадлежит ли отзыв пользователю
    const { data: existingReview, error: fetchError } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error('Ошибка при получении отзыва:', fetchError);
      return NextResponse.json(
        { error: 'Не удалось найти отзыв' },
        { status: 404 }
      );
    }
    
    if (existingReview.author_id !== userData.id) {
      return NextResponse.json(
        { error: 'У вас нет прав на удаление этого отзыва' },
        { status: 403 }
      );
    }
    
    // Удаляем отзыв
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Ошибка при удалении отзыва:', error);
      return NextResponse.json(
        { error: 'Не удалось удалить отзыв' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Отзыв успешно удален'
    });
    
  } catch (error) {
    console.error('Внутренняя ошибка сервера:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
} 