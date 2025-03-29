import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import supabase from '@/lib/supabaseClient';

// Убираем временное хранилище
// let tierlists = [];
// let tierlistItems = [];

// Функция для получения ID пользователя из куки
function getUserIdFromCookies() {
  try {
    const cookieStore = cookies();
    const userCookie = cookieStore.get('twitch_user')?.value;
    if (userCookie) {
      const userData = JSON.parse(userCookie);
      // Предполагаем, что ID пользователя хранится как строка (например, из Twitch API)
      // Если в вашей таблице user_id другого типа, нужно привести его здесь
      return String(userData.id); 
    }
    return null;
  } catch (error) {
    console.error('Error getting user ID from cookies:', error);
    return null;
  }
}

// GET - получение тирлистов
export async function GET() {
  try {
    const { data: tierlistsData, error } = await supabase
      .from('tierlists')
      .select('*'); // Возможно, стоит добавить .order() для сортировки

    if (error) {
      console.error('Error fetching tierlists:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tierlists' },
        { status: 500 }
      );
    }

    // Добавим получение элементов для каждого тирлиста
    const tierlistsWithItems = await Promise.all(tierlistsData.map(async (tierlist) => {
        const { data: items, error: itemsError } = await supabase
            .from('tierlist_items')
            .select('*')
            .eq('tierlist_id', tierlist.id)
            .order('position', { ascending: true }); // Сортируем элементы по позиции

        if (itemsError) {
            console.error(`Error fetching items for tierlist ${tierlist.id}:`, itemsError);
            // Можно вернуть тирлист без элементов или обработать ошибку иначе
            return { ...tierlist, items: [] }; 
        }
        return { ...tierlist, items: items || [] };
    }));


    return NextResponse.json(tierlistsWithItems);
  } catch (error) {
    console.error('Error in tierlists GET route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - создание нового тирлиста
export async function POST(request) {
  try {
    const userId = getUserIdFromCookies();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();

    // Добавляем user_id и дату создания к данным тирлиста
    const tierlistDataToInsert = {
      ...body,
      user_id: userId, // Добавляем ID пользователя
      created_at: new Date().toISOString(), // Явно устанавливаем дату создания
      updated_at: new Date().toISOString()  // И дату обновления
    };
    
    // Валидация: проверяем наличие обязательных полей, например, title
    if (!tierlistDataToInsert.title) {
        return NextResponse.json({ error: 'Tierlist title is required' }, { status: 400 });
    }

    // Убираем поле items из объекта для вставки в tierlists, если оно пришло
    const { items: itemsFromBody, ...tierlistCoreData } = tierlistDataToInsert;


    const { data: insertedTierlist, error: insertTierlistError } = await supabase
      .from('tierlists')
      .insert([tierlistCoreData]) // Вставляем данные без items
      .select()
      .single(); // Ожидаем одну запись

    if (insertTierlistError) {
      console.error('Error creating tierlist:', insertTierlistError);
      return NextResponse.json(
        { error: 'Failed to create tierlist', details: insertTierlistError.message },
        { status: 500 }
      );
    }

    // Если пришли элементы (items), вставляем их
    let insertedItems = [];
    if (itemsFromBody && Array.isArray(itemsFromBody) && itemsFromBody.length > 0) {
        const itemsToInsert = itemsFromBody.map((item, index) => ({
            tierlist_id: insertedTierlist.id, // Связываем с созданным тирлистом
            media_id: item.mediaId, // Проверьте имена полей в вашей таблице items
            tier: item.tier,
            position: index,
            // created_at и updated_at обычно управляются базой данных
        }));

        const { data: insertedItemsData, error: insertItemsError } = await supabase
            .from('tierlist_items')
            .insert(itemsToInsert)
            .select();
        
        if (insertItemsError) {
            console.error('Error inserting tierlist items:', insertItemsError);
            // Тирлист создан, но элементы не добавлены. Возможно, стоит вернуть ошибку?
            // Или вернуть тирлист без элементов и залогировать проблему.
            // Пока вернем тирлист без items и ошибку в консоль.
        } else {
            insertedItems = insertedItemsData || [];
        }
    }

    // Возвращаем созданный тирлист с его элементами (если они были успешно добавлены)
    return NextResponse.json({ ...insertedTierlist, items: insertedItems });
    
  } catch (error) {
    console.error('Error in tierlists POST route:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
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
    const tierlistId = data.id;

    // Валидация ID
    if (!tierlistId) {
      return NextResponse.json({ error: 'Tierlist ID is required for update' }, { status: 400 });
    }
    
    // 1. Получаем текущий тирлист для проверки владельца
    const { data: currentTierlist, error: fetchError } = await supabase
        .from('tierlists')
        .select('user_id') // Достаточно получить только user_id
        .eq('id', tierlistId)
        .single(); // Ожидаем одну запись или null

    if (fetchError || !currentTierlist) {
      console.error('Error fetching tierlist for update or not found:', fetchError);
      return NextResponse.json({ error: 'Tierlist not found' }, { status: 404 });
    }

    // 2. Проверяем владельца
    if (String(currentTierlist.user_id) !== userId) { // Приводим к строке для сравнения
      return NextResponse.json({ error: 'Forbidden: You can only update your own tierlists' }, { status: 403 });
    }

    // 3. Подготавливаем данные для обновления тирлиста
    // Убираем id и user_id из данных для обновления
    // const { id, user_id, items, created_at, ...updateData } = data; // Комментируем, т.к. id, user_id, created_at не используются
    const { items, ...updateData } = data; // Оставляем только items и остальное
    updateData.updated_at = new Date().toISOString(); // Обновляем дату

    const { data: updatedTierlistData, error: updateTierlistError } = await supabase
      .from('tierlists')
      .update(updateData)
      .eq('id', tierlistId)
      .select() // Возвращаем обновленную запись
      .single();

    if (updateTierlistError) {
      console.error('Error updating tierlist:', updateTierlistError);
      return NextResponse.json({ error: 'Failed to update tierlist', details: updateTierlistError.message }, { status: 500 });
    }

    // 4. Обрабатываем элементы (items), если они есть в запросе
    let finalItems = []; 
    if (items && Array.isArray(items)) {
      // 4.1 Удаляем все старые элементы для этого тирлиста
      const { error: deleteItemsError } = await supabase
        .from('tierlist_items')
        .delete()
        .eq('tierlist_id', tierlistId);

      if (deleteItemsError) {
        console.error('Error deleting old tierlist items:', deleteItemsError);
        // Продолжаем, но элементы могут быть не обновлены корректно
        // Можно вернуть ошибку или предупреждение
      }

      // 4.2 Вставляем новые элементы, если они не пустые
      if (items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
            tierlist_id: tierlistId,
            media_id: item.mediaId, // Убедитесь, что имена полей соответствуют таблице
            tier: item.tier,
            position: index,
            // created_at и updated_at обычно управляются БД
        }));

        const { data: insertedItemsData, error: insertItemsError } = await supabase
          .from('tierlist_items')
          .insert(itemsToInsert)
          .select();

        if (insertItemsError) {
            console.error('Error inserting new tierlist items:', insertItemsError);
            // Ошибка при вставке новых элементов, вернем тирлист без них
        } else {
            finalItems = insertedItemsData || [];
        }
      }
      // Если items был пустым массивом, старые удалены, новые не вставлялись - finalItems останется пустым.
    } else {
      // Если items не было в запросе, просто получаем текущие элементы из БД
       const { data: currentItems, error: fetchCurrentItemsError } = await supabase
            .from('tierlist_items')
            .select('*')
            .eq('tierlist_id', tierlistId)
            .order('position', { ascending: true });
        if (fetchCurrentItemsError) {
             console.error('Error fetching current items after update:', fetchCurrentItemsError);
        } else {
            finalItems = currentItems || [];
        }
    }

    return NextResponse.json({ ...updatedTierlistData, items: finalItems });

  } catch (error) {
    console.error('Error in tierlists PUT route:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
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
      return NextResponse.json({ error: 'Tierlist ID is required in query parameters' }, { status: 400 });
    }

    // 1. Получаем тирлист для проверки владельца
    const { data: currentTierlist, error: fetchError } = await supabase
        .from('tierlists')
        .select('user_id')
        .eq('id', tierlistId)
        .single();

    if (fetchError || !currentTierlist) {
      // Если fetchError это 'PGRST116', значит запись не найдена
       if (fetchError && fetchError.code === 'PGRST116') {
           return NextResponse.json({ error: 'Tierlist not found' }, { status: 404 });
       }
      console.error('Error fetching tierlist for delete:', fetchError);
      return NextResponse.json({ error: 'Tierlist not found or error fetching it' }, { status: 404 });
    }

    // 2. Проверяем владельца
    if (String(currentTierlist.user_id) !== userId) {
      return NextResponse.json({ error: 'Forbidden: You can only delete your own tierlists' }, { status: 403 });
    }

    // 3. Сначала удаляем связанные элементы (если нет каскадного удаления)
    const { error: deleteItemsError } = await supabase
        .from('tierlist_items')
        .delete()
        .eq('tierlist_id', tierlistId);
    
    if (deleteItemsError) {
        console.error('Error deleting tierlist items before deleting tierlist:', deleteItemsError);
        // Можно решить, прерывать ли операцию или продолжить удаление тирлиста
        return NextResponse.json({ error: 'Failed to delete associated items', details: deleteItemsError.message }, { status: 500 });
    }

    // 4. Удаляем сам тирлист
    const { error: deleteTierlistError } = await supabase
        .from('tierlists')
        .delete()
        .eq('id', tierlistId);

    if (deleteTierlistError) {
        console.error('Error deleting tierlist:', deleteTierlistError);
        return NextResponse.json({ error: 'Failed to delete tierlist', details: deleteTierlistError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Tierlist ${tierlistId} deleted successfully.` });

  } catch (error) {
    console.error('Error in tierlists DELETE route:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
} 