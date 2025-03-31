import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr'; // Используем SSR клиент

export async function POST(request) {
  const cookieStore = cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value },
        set(name, value, options) { cookieStore.set({ name, value, ...options, sameSite: options.sameSite || 'Lax' }) },
        remove(name, options) { cookieStore.set({ name, value: '', ...options, sameSite: options.sameSite || 'Lax' }) },
      },
    }
  );

  try {
    // 1. Проверяем сессию и получаем токен
    const { data: { session }, error: sessionError } = await supabaseAuth.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Необходима аутентификация' }, { status: 401 });
    }
    const accessToken = session.provider_token;
    if (!accessToken) {
      return NextResponse.json({ error: 'Не удалось получить токен доступа Twitch из сессии' }, { status: 401 });
    }

    // 2. Получаем ID стримера и список ID подписчиков SU из тела запроса
    const { suFollowerIds, userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'Требуется ID стримера (userId) для проверки' }, { status: 400 });
    }
    if (!suFollowerIds || !Array.isArray(suFollowerIds) || suFollowerIds.length === 0) {
      // Если список ID подписчиков пуст, возвращаем пустой массив
      return NextResponse.json({ followerIds: [] });
    }
    
    // 3. Проверяем Client ID
    const TWITCH_CLIENT_ID = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
    if (!TWITCH_CLIENT_ID) {
      console.error('API check-followers: TWITCH_CLIENT_ID отсутствует');
      return NextResponse.json({ error: 'Ошибка конфигурации сервера' }, { status: 500 });
    }
    
    console.log(`API check-followers: Проверка ${suFollowerIds.length} подписчиков для стримера ${userId}`);

    // 4. Получаем ВСЕХ фолловеров стримера с Twitch (может быть много!)
    // Twitch API /channels/followers возвращает максимум 100 за раз, 
    // поэтому для полной проверки нужен цикл с пагинацией.
    // Это может быть очень долгим и ресурсоемким процессом.
    // АЛЬТЕРНАТИВА: Использовать /users/follows для проверки КАЖДОГО подписчика SU отдельно?
    // Это будет N запросов, где N - кол-во suFollowerIds. Тоже может быть много.
    
    // --- ВАРИАНТ 1: Получение всех фолловеров стримера (с пагинацией) --- 
    let allTwitchFollowerIds = new Set();
    let cursor = null;
    let pages = 0;
    const MAX_PAGES = 10; // Ограничение на всякий случай

    try {
        do {
            const apiUrl = new URL(`https://api.twitch.tv/helix/channels/followers`);
            apiUrl.searchParams.append('broadcaster_id', userId);
            apiUrl.searchParams.append('first', '100');
            if (cursor) {
                apiUrl.searchParams.append('after', cursor);
            }

            const response = await fetch(apiUrl.toString(), {
                headers: { 'Client-ID': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${accessToken}` }
            });

            if (!response.ok) {
                console.error(`API check-followers: Ошибка Twitch API ${response.status} при получении страницы ${pages + 1}`);
                // Решаем, прерывать ли или продолжать с тем, что есть
                throw new Error(`Twitch API error: ${response.status}`); 
            }

            const data = await response.json();
            data.data?.forEach(follower => allTwitchFollowerIds.add(follower.user_id));
            cursor = data.pagination?.cursor;
            pages++;

        } while (cursor && pages < MAX_PAGES);

        if (pages === MAX_PAGES && cursor) {
            console.warn(`API check-followers: Достигнут лимит страниц (${MAX_PAGES}) при получении фолловеров для ${userId}. Проверка может быть неполной.`);
        }

    } catch (fetchError) {
        console.error('API check-followers: Ошибка при получении полного списка фолловеров:', fetchError);
        return NextResponse.json({ error: 'Ошибка при получении данных от Twitch' }, { status: 502 }); // Bad Gateway
    }

    // 5. Фильтруем ID подписчиков SU, которые есть в списке фолловеров Twitch
    const actualFollowerIds = suFollowerIds.filter(suId => allTwitchFollowerIds.has(suId));

    console.log(`API check-followers: Найдено ${actualFollowerIds.length} актуальных фолловеров из ${suFollowerIds.length} проверенных.`);

    return NextResponse.json({ followerIds: actualFollowerIds });

  } catch (error) {
    console.error('API check-followers: Внутренняя ошибка сервера:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
} 