import { NextResponse } from 'next/server';
// import { cookies } from 'next/headers'; // Не используется напрямую
import { createServerClient } from '@supabase/ssr'; // Используем SSR клиент
import { cookies } from 'next/headers'; // Нужен для createServerClient
import { DataStorage } from '../../../utils/dataStorage';
import { sanitizeObject } from '@/utils/securityUtils';

// Утилита для безопасного запроса к Twitch API
async function safeTwitchRequest(url, accessToken, clientId) {
  try {
    const response = await fetch(url, {
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    if (!response.ok) {
      console.warn(`API user-stats: Ошибка Twitch API (${url}): ${response.status}`);
      return { ok: false, status: response.status, data: null };
    }
    const data = await response.json();
    return { ok: true, status: response.status, data };
  } catch (error) {
    console.error(`API user-stats: Ошибка сети при запросе (${url}):`, error);
    return { ok: false, status: 500, data: null }; // Возвращаем 500 при ошибке сети
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
    if (!accessToken) {
        return NextResponse.json({ error: 'Не удалось получить токен доступа Twitch из сессии' }, { status: 401 });
    }

    // 2. Получаем ID пользователя из URL и проверяем Client ID
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Требуется ID пользователя (userId)' }, { status: 400 });
    }
    const TWITCH_CLIENT_ID = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
    if (!TWITCH_CLIENT_ID) {
      console.error('API user-stats: TWITCH_CLIENT_ID отсутствует');
      return NextResponse.json({ error: 'Ошибка конфигурации сервера' }, { status: 500 });
    }

    console.log(`API user-stats: Запрос статистики для ${userId}`);

    // 3. Выполняем запросы к Twitch API параллельно
    const [userResult, followersResult, followingsResult, streamResult] = await Promise.all([
      safeTwitchRequest(`https://api.twitch.tv/helix/users?id=${userId}`, accessToken, TWITCH_CLIENT_ID),
      safeTwitchRequest(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${userId}&first=5`, accessToken, TWITCH_CLIENT_ID), // Используем /channels/followers
      safeTwitchRequest(`https://api.twitch.tv/helix/channels/followed?user_id=${userId}&first=5`, accessToken, TWITCH_CLIENT_ID), // /channels/followed для подписок пользователя
      safeTwitchRequest(`https://api.twitch.tv/helix/streams?user_id=${userId}`, accessToken, TWITCH_CLIENT_ID)
    ]);

    // 4. Обрабатываем результаты
    // Пользователь
    if (!userResult.ok || !userResult.data?.data || userResult.data.data.length === 0) {
        // Если пользователя не нашли, возвращаем 404
        return NextResponse.json({ error: 'Пользователь Twitch не найден' }, { status: 404 });
    }
    const user = userResult.data.data[0];

    // Фолловеры
    const followers = {
        total: followersResult.ok ? (followersResult.data?.total || 0) : 0,
        recentFollowers: followersResult.ok ? (followersResult.data?.data || []) : []
    };

    // Фолловинги (подписки пользователя)
    const followings = {
        total: followingsResult.ok ? (followingsResult.data?.total || 0) : 0,
        recentFollowings: followingsResult.ok ? (followingsResult.data?.data || []) : []
    };

    // Стрим
    const stream = {
        isLive: streamResult.ok && streamResult.data?.data?.length > 0,
        currentStream: streamResult.ok && streamResult.data?.data?.length > 0 ? streamResult.data.data[0] : null
    };

    // 5. Формируем ответ
    const responseData = {
      id: user.id,
      login: user.login,
      display_name: user.display_name,
      profile_image_url: user.profile_image_url,
      description: user.description,
      view_count: user.view_count,
      created_at: user.created_at,
      broadcaster_type: user.broadcaster_type,
      followers,
      followings,
      stream,
    };

    // Сохраняем в кэш для быстрого доступа в будущем
    try {
      await DataStorage.saveData('user_stats', {
        ...responseData,
        timestamp: Date.now()
      });
    } catch (e) {
      console.warn('Не удалось сохранить статистику в кэш:', e);
    }

    return NextResponse.json(sanitizeObject(responseData));

  } catch (error) {
    console.error('API user-stats: Внутренняя ошибка сервера:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
} 