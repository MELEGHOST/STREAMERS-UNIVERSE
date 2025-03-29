import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import supabase from '@/lib/supabaseClient'; // Убедитесь, что путь к клиенту Supabase правильный

// Функция для получения ID пользователя из куки (можно вынести в утилиту, если используется в нескольких местах)
function getCurrentUserIdFromCookies() {
  try {
    const cookieStore = cookies();
    const userCookie = cookieStore.get('twitch_user')?.value;
    if (userCookie) {
      const userData = JSON.parse(userCookie);
      // Возвращаем ID как строку
      return String(userData?.id);
    }
    return null;
  } catch (error) {
    console.error('Ошибка при получении ID пользователя из cookies:', error);
    return null;
  }
}

// GET - Получение статуса подписки (новый метод)
export async function GET(request) {
  try {
    const currentUserId = getCurrentUserIdFromCookies();
    if (!currentUserId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const url = new URL(request.url);
    const targetUserId = url.searchParams.get('targetUserId');

    if (!targetUserId) {
      return NextResponse.json({ error: 'Не указан ID целевого пользователя (targetUserId)' }, { status: 400 });
    }

    // Ищем запись о подписке в базе данных
    // const { data, error, count } = await supabase // Комментируем data
    const { error, count } = await supabase
      .from('user_follows') // Предполагаемое имя таблицы подписок
      .select('*', { count: 'exact', head: true }) // Просто проверяем наличие записи
      .eq('follower_id', currentUserId) // ID того, кто подписывается
      .eq('following_id', targetUserId); // ID того, на кого подписываются

    if (error) {
      console.error('Ошибка при проверке подписки в Supabase:', error);
      return NextResponse.json({ error: 'Ошибка при проверке статуса подписки' }, { status: 500 });
    }

    const isFollowing = count > 0;

    return NextResponse.json({ isFollowing });

  } catch (error) {
    console.error('Ошибка в GET /api/twitch/follow:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}


// POST - Подписка/Отписка
export async function POST(request) {
  try {
    const currentUserId = getCurrentUserIdFromCookies();
    if (!currentUserId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Получаем данные запроса
    const { targetUserId, action } = await request.json();

    if (!targetUserId || !action || (action !== 'follow' && action !== 'unfollow')) {
      return NextResponse.json({ error: 'Необходимы параметры targetUserId и action ("follow" или "unfollow")' }, { status: 400 });
    }

    // Проверяем, что пользователь не пытается подписаться/отписаться от самого себя
    if (currentUserId === String(targetUserId)) { // Приводим targetUserId к строке на всякий случай
      return NextResponse.json({ error: 'Нельзя выполнить это действие для самого себя' }, { status: 400 });
    }

    // --- Логика подписки (action === 'follow') ---
    if (action === 'follow') {
      // Проверяем, не существует ли уже подписка, чтобы избежать дублирования
      const { error: checkError, count } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', currentUserId)
        .eq('following_id', targetUserId);

      if (checkError) {
          console.error('Ошибка при проверке существующей подписки:', checkError);
          return NextResponse.json({ error: 'Ошибка при проверке подписки' }, { status: 500 });
      }

      if (count > 0) {
          // Подписка уже существует
          return NextResponse.json({ success: true, message: 'Вы уже подписаны на этого пользователя' });
      }

      // Создаем запись о подписке
      // const { data, error: insertError } = await supabase // Комментируем data
      const { error: insertError } = await supabase
        .from('user_follows')
        .insert({ 
          follower_id: currentUserId, 
          following_id: targetUserId,
          // created_at: new Date().toISOString() // Supabase обычно добавляет это автоматически
        })
        .select(); // Возвращаем созданную запись (опционально)

      if (insertError) {
        console.error('Ошибка при создании подписки в Supabase:', insertError);
        // Обрабатываем возможную ошибку нарушения внешнего ключа (если targetUserId не существует)
        if (insertError.code === '23503') { // Код ошибки PostgreSQL для foreign key violation
          return NextResponse.json({ error: 'Целевой пользователь не найден' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Не удалось подписаться' }, { status: 500 });
      }

      // Опционально: Получить информацию о targetUser, если нужно вернуть ее клиенту
      // (как было в старом коде, но требует доп. запроса к Twitch API или вашей БД пользователей)

      return NextResponse.json({ 
        success: true, 
        message: 'Вы успешно подписались'
        // userInfo: targetUserInfo // Если получали информацию
      });
    }

    // --- Логика отписки (action === 'unfollow') ---
    if (action === 'unfollow') {
      // Удаляем запись о подписке
      const { error: deleteError, count: deleteCount } = await supabase
        .from('user_follows')
        .delete({ count: 'exact'}) // Запрашиваем количество удаленных строк
        .eq('follower_id', currentUserId)
        .eq('following_id', targetUserId);

      if (deleteError) {
        console.error('Ошибка при удалении подписки из Supabase:', deleteError);
        return NextResponse.json({ error: 'Не удалось отписаться' }, { status: 500 });
      }
      
      // Проверяем, была ли запись удалена (возможно, пользователь уже был отписан)
       if (deleteCount === 0) {
           console.log(`Попытка отписаться, но подписка не найдена: ${currentUserId} -> ${targetUserId}`);
           // Возвращаем успех, т.к. конечный результат (отсутствие подписки) достигнут
       }

      return NextResponse.json({ 
        success: true, 
        message: 'Вы успешно отписались' 
      });
    }

  } catch (error) {
    console.error('Ошибка в POST /api/twitch/follow:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
} 