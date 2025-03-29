import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import supabase from '@/lib/supabaseClient';

// Функция для получения ID пользователя из куки
function getCurrentUserIdFromCookies() {
  try {
    const cookieStore = cookies();
    const userCookie = cookieStore.get('twitch_user')?.value;
    if (userCookie) {
      const userData = JSON.parse(userCookie);
      return String(userData?.id);
    }
    return null;
  } catch (error) {
    console.error('Ошибка при получении ID пользователя из cookies:', error);
    return null;
  }
}

// POST /api/reviews/[reviewId]/vote
export async function POST(request, { params }) {
  const { reviewId } = params; // Получаем reviewId из URL
  const currentUserId = getCurrentUserIdFromCookies();

  if (!currentUserId) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  if (!reviewId) {
      return NextResponse.json({ error: 'Не указан ID отзыва' }, { status: 400 });
  }

  let voteType; // 1 для лайка, -1 для дизлайка, 0 для отмены голоса
  try {
      const body = await request.json();
      voteType = parseInt(body.voteType, 10);
      if (![1, -1, 0].includes(voteType)) {
          throw new Error('Invalid voteType');
      }
  } catch (e) {
      return NextResponse.json({ error: 'Некорректный тип голоса (voteType должен быть 1, -1 или 0)' }, { status: 400 });
  }

  try {
    // 1. Найти существующий голос пользователя за этот отзыв
    const { data: existingVote, error: findError } = await supabase
      .from('review_votes')
      .select('vote_type')
      .eq('review_id', reviewId)
      .eq('user_id', currentUserId)
      .maybeSingle(); // Может вернуть null, если голоса нет

    if (findError) {
      console.error('Ошибка при поиске существующего голоса:', findError);
      return NextResponse.json({ error: 'Ошибка при обработке голоса' }, { status: 500 });
    }

    const currentVote = existingVote ? existingVote.vote_type : null;

    // 2. Определить действие (вставить, обновить, удалить)
    if (voteType === 0) { // Отмена голоса
        if (currentVote) { // Если голос был, удаляем
            const { error: deleteError } = await supabase
                .from('review_votes')
                .delete()
                .match({ review_id: reviewId, user_id: currentUserId });
            if (deleteError) throw deleteError; // Передаем ошибку в catch
        }
        // Если голоса не было, ничего не делаем
    } else { // Лайк (1) или Дизлайк (-1)
        if (currentVote === voteType) { // Повторное нажатие - отмена
             const { error: deleteError } = await supabase
                .from('review_votes')
                .delete()
                .match({ review_id: reviewId, user_id: currentUserId });
             if (deleteError) throw deleteError;
             voteType = 0; // Возвращаем, что голос отменен
        } else { // Новый голос или смена голоса
            const { error: upsertError } = await supabase
                .from('review_votes')
                .upsert({ 
                    review_id: reviewId,
                    user_id: currentUserId,
                    vote_type: voteType
                 }, { 
                    onConflict: 'review_id, user_id' // Указываем столбцы для ON CONFLICT
                 }); 
            if (upsertError) throw upsertError; // Передаем ошибку в catch
        }
    }

    // 3. Получить АКТУАЛЬНЫЕ счетчики лайков/дизлайков из основной таблицы отзывов
    // ПРЕДУПРЕЖДЕНИЕ: Эти счетчики могут быть неактуальны, если они не обновляются
    // триггерами в БД одновременно с записью голоса.
    const { data: reviewData, error: fetchReviewError } = await supabase
      .from('reviews')
      .select('likes, dislikes') // Предполагаем, что такие колонки есть
      .eq('id', reviewId)
      .single();

    if (fetchReviewError) {
       console.error('Ошибка при получении счетчиков отзыва:', fetchReviewError);
       // Возвращаем результат без счетчиков, но с новым статусом голоса
        return NextResponse.json({ 
            success: true, 
            currentUserVote: voteType === 0 ? null : voteType, // 1, -1 или null
            message: voteType === 0 ? 'Голос отменен' : 'Голос учтен' 
        });
    }

    // 4. Вернуть результат
    return NextResponse.json({
      success: true,
      likes: reviewData?.likes ?? 0,
      dislikes: reviewData?.dislikes ?? 0,
      currentUserVote: voteType === 0 ? null : voteType, // 1, -1 или null
      message: voteType === 0 ? 'Голос отменен' : 'Голос учтен' 
    });

  } catch (error) {
    console.error('Ошибка при обработке голоса за отзыв:', error);
    // Обработка специфических ошибок БД (например, reviewId не существует)
    if (error.code === '23503') { // Foreign key violation
        return NextResponse.json({ error: 'Отзыв не найден' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Внутренняя ошибка сервера при голосовании' }, { status: 500 });
  }
} 