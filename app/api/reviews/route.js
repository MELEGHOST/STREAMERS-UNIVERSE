import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
// import { createClient } from '@supabase/supabase-js'; // Заменяем на SSR клиент
import { createServerClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Стараемся не использовать сервисный ключ для операций пользователя

// Вспомогательная функция для создания SSR клиента
const createSupabaseClient = () => {
    const cookieStore = cookies();
    return createServerClient(
      supabaseUrl,
      supabaseAnonKey, // Используем ANON ключ, RLS должны защищать данные
      {
        cookies: {
          get(name) { return cookieStore.get(name)?.value },
          set(name, value, options) { cookieStore.set({ name, value, ...options }) },
          remove(name, options) { cookieStore.set({ name, value: '', ...options }) },
        },
      }
    );
};

// УДАЛЕНО: getUserDataFromCookies
/*
function getUserDataFromCookies() { ... }
*/

// Обработчик GET-запросов для получения отзывов
export async function GET(request) {
  const supabase = createSupabaseClient(); // Используем SSR клиент (с ANON ключом)
                                          // Предполагаем, что RLS разрешает чтение отзывов всем
  try {
    const { searchParams } = new URL(request.url);
    
    // Получаем параметры запроса
    const authorId = searchParams.get('authorId'); // ID автора отзыва (если нужны отзывы, сделанные пользователем)
    const targetId = searchParams.get('targetId'); // ID целевого стримера/объекта (если нужны отзывы о стримере)
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    
    // Формируем запрос
    let queryBase = supabase
      .from('reviews')
      // Явно выбираем нужные поля, чтобы не запрашивать лишнего
      .select('id, content, rating, author_id, target_id, target_name, target_type, created_at, updated_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);
    
    // Применяем фильтры в зависимости от переданных параметров
    if (authorId) {
      queryBase = queryBase.eq('author_id', authorId);
    } else if (targetId) {
      queryBase = queryBase.eq('target_id', targetId);
    }
    
    // Выполняем запрос
    const { data: reviews, error, count } = await queryBase;
    
    if (error) {
      console.error('Ошибка при получении отзывов:', error);
      return NextResponse.json({ error: 'Не удалось получить отзывы' }, { status: 500 });
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
        totalReviews: count || 0, // Используем count из ответа
        currentPage: page,
        totalPages: Math.ceil((count || 0) / limit),
        limit,
        // Логика пагинации может потребовать корректировки в зависимости от того, как count работает с range
        // Возможно, count возвращает общее число БЕЗ учета range?
        hasNextPage: (offset + reviews.length) < (count || 0),
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
  const supabase = createSupabaseClient(); // Используем SSR клиент
  try {
    // 1. Проверяем сессию Supabase
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Необходима авторизация для создания отзыва' }, { status: 401 });
    }
    const currentUserId = session.user.id; // ID текущего пользователя из сессии
    
    // 2. Парсим данные из тела запроса
    const requestData = await request.json();
    // Убираем authorId из деструктуризации, т.к. берем его из сессии
    const { content, rating, targetName, targetId, targetType = 'other' } = requestData; 
    
    // 3. Валидация данных
    if (!content || !rating || !targetName) {
      return NextResponse.json({ error: 'Отсутствуют обязательные поля (content, rating, targetName)' }, { status: 400 });
    }
    
    // 4. Подготавливаем данные для вставки
    const reviewData = {
      author_id: currentUserId, // Используем ID из сессии
      content,
      rating,
      target_name: targetName,
      target_type: targetType,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (targetId) {
      reviewData.target_id = targetId;
    }
    
    // 5. Вставляем отзыв в базу данных (клиент уже аутентифицирован сессией)
    const { data: review, error } = await supabase
      .from('reviews')
      .insert(reviewData)
      .select() // Выбираем все поля созданной записи
      .single();
    
    if (error) {
      console.error('Ошибка при создании отзыва:', error);
      // Проверяем специфичные ошибки Supabase, если нужно (например, нарушение RLS)
      if (error.code === '42501') { // policy_violation
           return NextResponse.json({ error: 'Ошибка прав доступа при создании отзыва' }, { status: 403 });
      }
      return NextResponse.json({ error: 'Не удалось создать отзыв', details: error.message }, { status: 500 });
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
  const supabase = createSupabaseClient(); // Используем SSR клиент
  try {
    // 1. Проверяем сессию Supabase
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Необходима авторизация для редактирования отзыва' }, { status: 401 });
    }
    const currentUserId = session.user.id;
    
    // 2. Парсим данные из тела запроса
    // Убираем authorId
    const { id, content, rating } = await request.json(); 
    
    // 3. Валидация данных
    if (!id || !content || !rating) {
      return NextResponse.json({ error: 'Отсутствуют обязательные поля (id, content, rating)' }, { status: 400 });
    }
    
    // 4. Пытаемся обновить отзыв, полагаясь на RLS для проверки прав
    // RLS должен быть настроен так, чтобы разрешать UPDATE только если auth.uid() == author_id
    const { data: updatedReview, error } = await supabase
      .from('reviews')
      .update({ 
          content, 
          rating, 
          updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      // Добавляем проверку на author_id здесь, как доп. гарантия или если RLS нет
      .eq('author_id', currentUserId) 
      .select() // Возвращаем обновленную запись
      .single();

    if (error) {
      console.error('Ошибка при обновлении отзыва:', error);
      // Если ошибка 'PGRST116' (Not Found), значит либо ID не тот, либо автор не тот
      if (error.code === 'PGRST116') {
          return NextResponse.json({ error: 'Отзыв не найден или у вас нет прав на его редактирование' }, { status: 404 }); 
      }
      // Другие возможные ошибки (например, нарушение политики)
       if (error.code === '42501') { 
           return NextResponse.json({ error: 'Ошибка прав доступа при обновлении отзыва' }, { status: 403 });
      }
      return NextResponse.json({ error: 'Не удалось обновить отзыв', details: error.message }, { status: 500 });
    }

    // Если updatedReview пустой после .single() без ошибки, это тоже означает, что запись не найдена/не обновлена
    if (!updatedReview) {
         return NextResponse.json({ error: 'Отзыв не найден или у вас нет прав на его редактирование' }, { status: 404 }); 
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
  const supabase = createSupabaseClient(); // Используем SSR клиент
  try {
    // 1. Проверяем сессию Supabase
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Необходима авторизация для удаления отзыва' }, { status: 401 });
    }
    const currentUserId = session.user.id;

    // 2. Получаем ID отзыва из URL
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Отсутствует ID отзыва' }, { status: 400 });
    }

    // 3. Пытаемся удалить отзыв, полагаясь на RLS
    // RLS должен разрешать DELETE только если auth.uid() == author_id
    const { error, count } = await supabase
      .from('reviews')
      .delete({ count: 'exact' }) // Запрашиваем количество удаленных строк
      .eq('id', id)
      .eq('author_id', currentUserId); // Доп. проверка

    if (error) {
      console.error('Ошибка при удалении отзыва:', error);
       if (error.code === '42501') { 
           return NextResponse.json({ error: 'Ошибка прав доступа при удалении отзыва' }, { status: 403 });
      }
      return NextResponse.json({ error: 'Не удалось удалить отзыв', details: error.message }, { status: 500 });
    }

    // Проверяем, была ли строка удалена
    if (count === 0) {
        return NextResponse.json({ error: 'Отзыв не найден или у вас нет прав на его удаление' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Отзыв успешно удален' });

  } catch (error) {
    console.error('Внутренняя ошибка сервера:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
} 