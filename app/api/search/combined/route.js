import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { searchTwitchChannels, getTwitchUsers } from '../../../utils/twitchClient.js'; // Убедимся, что путь верный

export async function GET(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[API /search/combined] Supabase configuration missing");
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } }) : null;

  const query = request.nextUrl.searchParams.get('query');
  if (!query || query.trim().length < 2) {
    return NextResponse.json([], { status: 200 });
  }

  console.log(`[API /search/combined] Received search query: "${query}"`);

  try {
    // Поиск в нашей базе
    let supabaseUsersData = [];
    try {
      console.log('[API /search/combined] Searching in Supabase (user_profiles)...');
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('user_id, twitch_user_id, twitch_display_name, twitch_profile_image_url')
        .ilike('twitch_display_name', `%${query}%`)
        .limit(10);
      if (profileError) {
        console.error('[API /search/combined] Supabase search error:', profileError);
      } else {
        supabaseUsersData = profileData || [];
        console.log(`[API /search/combined] Found ${supabaseUsersData.length} potential profiles in Supabase.`);
      }
    } catch (dbError) {
      console.error('[API /search/combined] Critical Supabase search error:', dbError);
    }

    // Получаем логины из auth.users (только если доступен сервисный ключ)
    let supabaseUsersWithLogin = supabaseUsersData.map(p => ({ ...p, login: null }));
    if (supabaseAdmin && supabaseUsersData.length > 0) {
      const userIds = supabaseUsersData.map(p => p.user_id);
      try {
        console.log(`[API /search/combined] Fetching auth users to enrich login for ${userIds.length} users...`);
        const { data: { users: authUsersData }, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers();
        if (authUsersError) {
          console.error('[API /search/combined] Error fetching from auth.users:', authUsersError);
        } else {
          supabaseUsersWithLogin = supabaseUsersData.map(profile => {
            const authUser = authUsersData.find(u => u.id === profile.user_id);
            return {
              ...profile,
              login: authUser?.raw_user_meta_data?.login || authUser?.user_metadata?.user_name || null,
            };
          });
        }
      } catch (authFetchError) {
        console.error('[API /search/combined] Critical error fetching from auth.users:', authFetchError);
      }
    }

    // Поиск в Twitch API
    let twitchChannels = [];
    try {
      console.log('[API /search/combined] Searching in Twitch API...');
      twitchChannels = await searchTwitchChannels(query, 10);
    } catch (twitchError) {
      console.error('[API /search/combined] Twitch API search error:', twitchError);
    }

    // Обработка и объединение
    const combinedResults = [];
    const processedTwitchIds = new Set();

    supabaseUsersWithLogin.forEach(user => {
      const twitchId = user.twitch_user_id;
      if (twitchId) {
        processedTwitchIds.add(twitchId);
        combinedResults.push({
          twitch_id: twitchId,
          login: user.login,
          display_name: user.twitch_display_name || user.login,
          avatar_url: user.twitch_profile_image_url,
          registered: true,
        });
      }
    });

    const loginsToFetch = twitchChannels
      .filter(channel => !processedTwitchIds.has(channel.id))
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

    twitchChannels.forEach(channel => {
      if (processedTwitchIds.has(channel.id)) return;
      const detailedUser = additionalTwitchUsers.find(u => u.id === channel.id);
      combinedResults.push({
        twitch_id: channel.id,
        login: channel.broadcaster_login,
        display_name: channel.display_name,
        avatar_url: detailedUser?.profile_image_url || channel.thumbnail_url || null,
        registered: false,
        is_live: channel.is_live,
        title: channel.title,
      });
      processedTwitchIds.add(channel.id);
    });

    combinedResults.sort((a, b) => (b.registered - a.registered));

    console.log(`[API /search/combined] Returning ${combinedResults.length} combined results.`);
    return NextResponse.json(combinedResults);

  } catch (error) {
    console.error(`[API /search/combined] General error for query "${query}":`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';