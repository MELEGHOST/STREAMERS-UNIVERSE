import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr'; // Используем SSR клиент
import { sanitizeObject, sanitizeString } from '@/utils/securityUtils';
import supabase from '@/lib/supabaseClient'; // TODO: Проверить и заменить, если нужно

/**
 * Проверяет, зарегистрирован ли пользователь в Streamers Universe
 * @param {object} cookies - Объект с куками для проверки
 * @returns {boolean} - true, если пользователь зарегистрирован, иначе false
 */
function checkUserRegistrationInSU() {
  try {
    // Все пользователи Twitch считаются зарегистрированными в Streamers Universe
    return true;
  } catch (error) {
    console.error('Ошибка при проверке регистрации пользователя:', error);
    return true; // В случае ошибки также считаем пользователя зарегистрированным
  }
}

// Функция для получения социальных ссылок пользователя
async function getUserSocialLinks(supabaseClient, userId) {
  if (!userId) return null;
  try {
    // Используем переданный supabaseClient
    const { data, error } = await supabaseClient 
      .from('user_profiles')
      .select('social_links')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      // Не фатальная ошибка, просто ссылок нет или RLS запретил
      // Не логируем как ошибку, если это PGRST116 (Not Found)
      if (error.code !== 'PGRST116') { 
          console.warn('API search: Не удалось получить social_links:', error.message);
      }
      return null;
    }
    
    return data ? data.social_links : null;
  } catch (error) {
    console.error('API search: Критическая ошибка при получении social_links:', error);
    return null;
  }
}

// Функция для проверки, подписан ли текущий пользователь на найденного пользователя
async function checkIfUserIsFollowed(currentUserId, targetUserId, accessToken) {
  try {
    if (!currentUserId || !targetUserId) return false;
    
    const followResponse = await fetch(
      `https://api.twitch.tv/helix/users/follows?from_id=${currentUserId}&to_id=${targetUserId}`, 
      {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!followResponse.ok) {
      console.error('Error checking follow status:', followResponse.status);
      return false;
    }
    
    const followData = await followResponse.json();
    return followData.data && followData.data.length > 0;
  } catch (error) {
    console.error('Error checking if user is followed:', error);
    return false;
  }
}

// Функция для получения статуса подписки (isFollowed)
async function checkFollowStatus(fromId, toId, accessToken, clientId) {
  if (!fromId || !toId || !accessToken || !clientId) return false;
  try {
    const response = await fetch(`https://api.twitch.tv/helix/users/follows?from_id=${fromId}&to_id=${toId}`, {
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data.total > 0;
  } catch (error) {
    console.error('Error checking follow status:', error);
    return false;
  }
}

// Функция для получения общих подписок
async function getCommonFollowings(user1Id, user2Id, accessToken, clientId) {
    if (!user1Id || !user2Id || !accessToken || !clientId) return [];
    try {
        const [user1FollowsResponse, user2FollowsResponse] = await Promise.all([
            fetch(`https://api.twitch.tv/helix/users/follows?from_id=${user1Id}&first=100`, { headers: { 'Client-ID': clientId, 'Authorization': `Bearer ${accessToken}` } }),
            fetch(`https://api.twitch.tv/helix/users/follows?from_id=${user2Id}&first=100`, { headers: { 'Client-ID': clientId, 'Authorization': `Bearer ${accessToken}` } })
        ]);

        if (!user1FollowsResponse.ok || !user2FollowsResponse.ok) {
            console.warn('Could not fetch followings for one or both users');
            return [];
        }

        const user1FollowsData = await user1FollowsResponse.json();
        const user2FollowsData = await user2FollowsResponse.json();

        const user1FollowingSet = new Set(user1FollowsData?.data?.map(f => f.to_id) || []);
        const user2Followings = user2FollowsData?.data?.map(f => ({ id: f.to_id, name: f.to_name })) || [];

        const common = user2Followings.filter(f => user1FollowingSet.has(f.id));
        return common;

    } catch (error) {
        console.error('Error fetching common followings:', error);
        return [];
    }
}

export async function GET(request) {
  const cookieStore = cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value },
        set(name, value, options) { cookieStore.set({ name, value, ...options }) },
        remove(name, options) { cookieStore.set({ name, value: '', ...options }) },
      },
    }
  );

  try {
    // 1. Получаем сессию и токен
    const { data: { session }, error: sessionError } = await supabaseAuth.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Необходима аутентификация' }, { status: 401 });
    }
    const accessToken = session.provider_token;
    const currentUserId = session.user?.user_metadata?.provider_id; // ID текущего пользователя Twitch из сессии
    if (!accessToken) {
        return NextResponse.json({ error: 'Не удалось получить токен доступа Twitch из сессии' }, { status: 401 });
    }
    if (!currentUserId) {
        console.warn('API search: Не удалось получить provider_id текущего пользователя из сессии');
        // Продолжаем выполнение, но не сможем проверить подписку и общие подписки
    }

    // 2. Получаем поисковый запрос и Client ID
    const { searchParams } = new URL(request.url);
    const query = sanitizeString(searchParams.get('query'));
    if (!query) {
      return NextResponse.json({ error: 'Требуется поисковый запрос (query)' }, { status: 400 });
    }
    const TWITCH_CLIENT_ID = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
    if (!TWITCH_CLIENT_ID) {
      console.error('API search: TWITCH_CLIENT_ID отсутствует');
      return NextResponse.json({ error: 'Ошибка конфигурации сервера' }, { status: 500 });
    }

    console.log(`API search: Поиск по запросу "${query}"`);

    // 3. Ищем пользователя на Twitch
    const searchResponse = await fetch(`https://api.twitch.tv/helix/search/channels?query=${encodeURIComponent(query)}&first=1`, {
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error(`API search: Ошибка Twitch API /search/channels ${searchResponse.status}`, errorText);
      return NextResponse.json({ error: 'Ошибка при поиске пользователя на Twitch', details: errorText }, { status: searchResponse.status });
    }

    const searchData = await searchResponse.json();
    if (!searchData.data || searchData.data.length === 0) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    const twitchUser = searchData.data[0];
    const foundUserId = twitchUser.id; // ID найденного пользователя

    // 4. Получаем доп. данные: фолловеры, фолловинги, статус подписки, общие подписки
    let follower_count = 0;
    let following_count = 0;
    let isFollowed = false;
    let commonStreamers = [];

    // Запрос количества фолловеров (/channels/followers)
    try {
        const followersResponse = await fetch(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${foundUserId}`, {
            headers: { 'Client-ID': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${accessToken}` }
        });
        if (followersResponse.ok) {
            const followersData = await followersResponse.json();
            follower_count = followersData.total || 0;
        } else {
            console.warn(`API search: Не удалось получить кол-во фолловеров для ${foundUserId}: ${followersResponse.status}`);
        }
    } catch(e) { console.error('API search: Ошибка запроса кол-ва фолловеров:', e); }

    // Запрос количества фолловингов (/users/follows)
    try {
        const followingResponse = await fetch(`https://api.twitch.tv/helix/users/follows?from_id=${foundUserId}`, {
            headers: { 'Client-ID': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${accessToken}` }
        });
        if (followingResponse.ok) {
            const followingData = await followingResponse.json();
            following_count = followingData.total || 0;
        } else {
            console.warn(`API search: Не удалось получить кол-во фолловингов для ${foundUserId}: ${followingResponse.status}`);
        }
    } catch(e) { console.error('API search: Ошибка запроса кол-ва фолловингов:', e); }

    // Проверка подписки и общих подписок (только если есть ID текущего пользователя)
    if (currentUserId && currentUserId !== foundUserId) { // Не проверяем для самого себя
        try {
            [isFollowed, commonStreamers] = await Promise.all([
                checkFollowStatus(currentUserId, foundUserId, accessToken, TWITCH_CLIENT_ID),
                getCommonFollowings(currentUserId, foundUserId, accessToken, TWITCH_CLIENT_ID)
            ]);
        } catch(e) { console.error('API search: Ошибка запроса статуса/общих подписок:', e); }
    }

    // 5. Получаем данные из нашей БД (регистрация, соц. ссылки)
    const isRegisteredInSU = checkUserRegistrationInSU(); // Заглушка
    const socialLinks = isRegisteredInSU ? await getUserSocialLinks(supabaseAuth, foundUserId) : null;

    // 6. Формируем ответ
    const sanitizedTwitchUser = {
        id: twitchUser.id,
        login: twitchUser.broadcaster_login,
        display_name: twitchUser.display_name,
        profile_image_url: twitchUser.thumbnail_url,
        broadcaster_language: twitchUser.broadcaster_language,
        title: twitchUser.title,
        game_id: twitchUser.game_id,
        game_name: twitchUser.game_name,
        is_live: twitchUser.is_live,
        tags: twitchUser.tags,
        // Добавляем полученные данные
        follower_count: follower_count,
        following_count: following_count,
    };

    return NextResponse.json({
      twitchData: sanitizeObject(sanitizedTwitchUser),
      isStreamer: follower_count >= 265, // Примерная логика определения стримера
      isRegisteredInSU: isRegisteredInSU,
      isFollowed: isFollowed,
      commonStreamers: commonStreamers, // Уже должны быть массивом объектов { id, name }
      socialLinks: sanitizeObject(socialLinks), // Санитизируем на всякий случай
    });

  } catch (error) {
    console.error('API search: Внутренняя ошибка сервера:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера', message: error.message }, { status: 500 });
  }
} 