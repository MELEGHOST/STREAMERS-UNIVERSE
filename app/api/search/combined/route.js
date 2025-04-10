import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { searchTwitchChannels, getTwitchUsers } from '../../../utils/twitchClient.js'; // Убедимся, что путь верный

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; 
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request) {
  const query = request.nextUrl.searchParams.get('query');
  if (!query || query.trim().length < 2) {
    return NextResponse.json([], { status: 200 }); // Возвращаем пустой массив, если запрос короткий
  }

  console.log(`[API /search/combined] Received search query: "${query}"`);

  try {
    // --- Поиск в нашей базе (Supabase user_profiles + auth.users) --- 
    let supabaseUsers = [];
    try {
        console.log('[API /search/combined] Searching in Supabase...');
        // Убираем неиспользуемый запрос к auth.users
        /*
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({
             query: query, 
        });
        */
        const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            // Выбираем поля профиля и логин из связанной таблицы auth.users
            .select(`
                user_id,
                twitch_user_id,
                twitch_display_name,
                twitch_profile_image_url,
                auth_user:user_id ( raw_user_meta_data ) 
            `)
            .ilike('twitch_display_name', `%${query}%`) // Ищем по отображаемому имени
            .limit(10); 

      if (profileError) {
        console.error('[API /search/combined] Supabase search error:', profileError);
      } else {
        supabaseUsers = profileData || [];
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
    }
    
    // --- Обработка и объединение результатов --- 
    const combinedResults = [];
    const processedTwitchIds = new Set(); // Чтобы не дублировать юзеров

    // 1. Обрабатываем пользователей из нашей базы
    supabaseUsers.forEach(user => {
      const twitchLogin = user.auth_user?.raw_user_meta_data?.login;
      const twitchId = user.twitch_user_id; // <<< Используем twitch_user_id из user_profiles
      
      if (twitchId) { // Только если есть Twitch ID
          processedTwitchIds.add(twitchId);
          combinedResults.push({
            twitch_id: twitchId,
            login: twitchLogin, // Логин из auth.users
            display_name: user.twitch_display_name || twitchLogin, // Отображаемое имя из профиля или логин
            avatar_url: user.twitch_profile_image_url, // Аватар из профиля
            registered: true, 
          });
      }
    });

    // 2. Обрабатываем пользователей из Twitch API, которых нет в нашей базе
    const loginsToFetch = twitchChannels
        .filter(channel => !processedTwitchIds.has(channel.id)) // Исключаем уже добавленных по ID
        .map(channel => channel.broadcaster_login);

    let additionalTwitchUsers = [];
    if (loginsToFetch.length > 0) {
        try {
            console.log(`[API /search/combined] Fetching additional user data from Twitch for: ${loginsToFetch.join(', ')}`);
            additionalTwitchUsers = await getTwitchUsers(loginsToFetch);
        } catch (twitchError) {
            console.error('[API /search/combined] Twitch API get users error:', twitchError);
        }
    }

    // Добавляем каналы из Twitch, которых не было в нашей базе
    twitchChannels.forEach(channel => {
      if (processedTwitchIds.has(channel.id)) return; 
      
      const detailedUser = additionalTwitchUsers.find(u => u.id === channel.id);
      
      combinedResults.push({
        twitch_id: channel.id, 
        login: channel.broadcaster_login,
        display_name: channel.display_name,
        avatar_url: detailedUser?.profile_image_url || channel.thumbnail_url || null, // Используем аватар из getTwitchUsers или из search
        registered: false, 
        is_live: channel.is_live,
        title: channel.title,
      });
      processedTwitchIds.add(channel.id);
    });

    // Сортировка (опционально): сначала зарегистрированных
    combinedResults.sort((a, b) => (b.registered - a.registered));

    console.log(`[API /search/combined] Returning ${combinedResults.length} combined results.`);
    return NextResponse.json(combinedResults);

  } catch (error) {
    console.error(`[API /search/combined] General error for query "${query}":`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic'; 