import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js'; // Используем обычный клиент для чтения
import { searchTwitchChannels, getTwitchUsers } from '../../../../utils/twitchApi.js'; // <<< Уточненный относительный путь

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Создаем Supabase клиент для чтения данных профилей
// Важно: НЕ используем сервисный ключ здесь, т.к. это публичный API
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
  }

  console.log(`[API /search/combined] Received search query: "${query}"`);

  try {
    // --- Поиск в Supabase --- 
    let supabaseUsers = [];
    try {
      console.log('[API /search/combined] Searching in Supabase...');
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, user_metadata, raw_user_meta_data') // Выбираем нужные поля
        // Ищем по user_name или login (могут быть в разных местах)
        .or(`user_metadata->>user_name.ilike.%${query}%, raw_user_meta_data->>login.ilike.%${query}%`)
        .limit(10); // Ограничим результаты из базы

      if (error) {
        console.error('[API /search/combined] Supabase search error:', error);
        // Не прерываем поиск, просто логируем ошибку
      } else {
        supabaseUsers = data || [];
        console.log(`[API /search/combined] Found ${supabaseUsers.length} users in Supabase.`);
      }
    } catch (dbError) {
        console.error('[API /search/combined] Critical Supabase search error:', dbError);
    }

    // --- Поиск в Twitch API --- 
    let twitchChannels = [];
    try {
        console.log('[API /search/combined] Searching in Twitch API...');
        twitchChannels = await searchTwitchChannels(query, 10); // Ищем до 10 каналов
    } catch (twitchError) {
         console.error('[API /search/combined] Twitch API search error:', twitchError);
         // Не прерываем, если Twitch недоступен
    }
    
    // --- Обработка и объединение результатов --- 
    const combinedResults = [];
    const processedTwitchIds = new Set(); // Чтобы не дублировать юзеров

    // 1. Обрабатываем пользователей из нашей базы
    supabaseUsers.forEach(user => {
      const twitchLogin = user.raw_user_meta_data?.login;
      const twitchId = user.user_metadata?.provider_id;
      
      if (twitchId) processedTwitchIds.add(twitchId);
      
      combinedResults.push({
        twitch_id: twitchId,
        login: twitchLogin || user.user_metadata?.user_name, // Используем login или user_name
        display_name: user.user_metadata?.name || user.raw_user_meta_data?.display_name || twitchLogin,
        avatar_url: user.user_metadata?.avatar_url,
        registered: true, // Помечаем, что пользователь зареган у нас
        // Можно добавить другие поля из user_profiles, если нужно
      });
    });

    // 2. Обрабатываем пользователей из Twitch API, которых нет в нашей базе
    const loginsToFetch = twitchChannels
        .map(channel => channel.broadcaster_login)
        .filter(login => login && !supabaseUsers.some(su => su.raw_user_meta_data?.login?.toLowerCase() === login.toLowerCase())); // Исключаем уже добавленных по логину

    let additionalTwitchUsers = [];
    if (loginsToFetch.length > 0) {
        try {
            console.log(`[API /search/combined] Fetching additional user data from Twitch for: ${loginsToFetch.join(', ')}`);
            additionalTwitchUsers = await getTwitchUsers(loginsToFetch);
        } catch (twitchError) {
            console.error('[API /search/combined] Twitch API get users error:', twitchError);
        }
    }

    // Добавляем дополнительно найденных на Twitch (или тех, что были в search, но не в нашей базе)
    twitchChannels.forEach(channel => {
      // Проверяем, не обработали ли мы уже этого пользователя (по ID) из нашей базы
      if (processedTwitchIds.has(channel.id)) {
        return; 
      }
      
      // Ищем подробную инфу в additionalTwitchUsers (аватарка и т.д.)
      const detailedUser = additionalTwitchUsers.find(u => u.id === channel.id);
      
      combinedResults.push({
        twitch_id: channel.id, 
        login: channel.broadcaster_login,
        display_name: channel.display_name,
        avatar_url: detailedUser?.profile_image_url || null, // Берем аватарку из getTwitchUsers, если есть
        registered: false, // Не зарегистрирован у нас
        is_live: channel.is_live, // Статус трансляции из поиска
        title: channel.title, // Название стрима
      });
      processedTwitchIds.add(channel.id); // Помечаем как обработанного
    });

    // Сортировка (опционально): например, сначала зарегистрированных
    combinedResults.sort((a, b) => (b.registered - a.registered));

    console.log(`[API /search/combined] Returning ${combinedResults.length} combined results.`);
    return NextResponse.json(combinedResults);

  } catch (error) {
    console.error(`[API /search/combined] General error for query "${query}":`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 