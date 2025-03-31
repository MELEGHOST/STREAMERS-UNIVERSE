import { NextResponse } from 'next/server';
// import { cookies } from 'next/headers'; // Не используется напрямую
import { createServerClient } from '@supabase/ssr'; // Используем SSR клиент
import { cookies } from 'next/headers'; // Нужен для createServerClient

export async function GET() {
  const cookieStore = cookies();

  // ДОБАВЛЕНО ЛОГИРОВАНИЕ ПРИШЕДШИХ COOKIE
  try {
    const allCookies = cookieStore.getAll();
    console.log('API user: Получены cookies:', JSON.stringify(allCookies, null, 2));
  } catch (e) {
    console.error('API user: Не удалось прочитать cookies:', e);
  }
  // --- КОНЕЦ ЛОГИРОВАНИЯ ---

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
    // 1. Проверяем сессию и получаем токен Twitch
    const { data: { session }, error: sessionError } = await supabaseAuth.auth.getSession();

    if (sessionError || !session) {
      console.error('API user: Ошибка сессии или сессия отсутствует', sessionError);
      return NextResponse.json({ error: 'Необходима аутентификация' }, { status: 401 });
    }

    const accessToken = session.provider_token;
    if (!accessToken) {
      console.error('API user: Отсутствует provider_token в сессии Supabase');
      // Статус 401, т.к. токена нет, хотя сессия есть - возможно, проблема с OAuth flow
      return NextResponse.json({ error: 'Не удалось получить токен доступа Twitch из сессии' }, { status: 401 }); 
    }

    const TWITCH_CLIENT_ID = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
    if (!TWITCH_CLIENT_ID) {
        console.error('API user: TWITCH_CLIENT_ID отсутствует');
        return NextResponse.json({ error: 'Ошибка конфигурации сервера' }, { status: 500 });
    }

    // 2. Получаем данные пользователя из Twitch API (/helix/users)
    const twitchResponse = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!twitchResponse.ok) {
      const errorText = await twitchResponse.text();
      console.error(`API user: Ошибка Twitch API /users ${twitchResponse.status}`, errorText);
      // Возвращаем статус ошибки от Twitch
      return NextResponse.json({ error: 'Ошибка при получении данных пользователя от Twitch', details: errorText }, { status: twitchResponse.status });
    }
    
    const twitchData = await twitchResponse.json();
    
    if (!twitchData.data || twitchData.data.length === 0) {
      console.error('API user: Не удалось получить данные пользователя от Twitch (пустой массив data)');
      return NextResponse.json({ error: 'Не удалось найти данные пользователя по токену' }, { status: 404 });
    }
    
    const userData = twitchData.data[0];
    const userId = userData.id;
    
    // 3. Получаем количество фолловеров пользователя (/helix/channels/followers)
    userData.follower_count = 0; // Инициализируем
    try {
        const followersResponse = await fetch(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${userId}`, { // Используем /channels/followers
          headers: {
            'Client-ID': TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (followersResponse.ok) {
          const followersData = await followersResponse.json();
          userData.follower_count = followersData.total || 0;
        } else {
          console.warn(`API user: Не удалось получить количество подписчиков для ${userId}: ${followersResponse.status}`);
          // Не прерываем выполнение, просто оставляем 0
        }
    } catch (followError) {
         console.error(`API user: Ошибка при запросе количества подписчиков для ${userId}:`, followError);
         // Не прерываем выполнение, просто оставляем 0
    }

    // 4. Получаем количество фолловингов (/helix/users/follows)
    userData.following_count = 0; // Инициализируем
    try {
        const followingResponse = await fetch(`https://api.twitch.tv/helix/users/follows?from_id=${userId}`, { // Здесь /users/follows все еще актуален
          headers: {
            'Client-ID': TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (followingResponse.ok) {
          const followingData = await followingResponse.json();
          userData.following_count = followingData.total || 0;
        } else {
          console.warn(`API user: Не удалось получить количество подписок для ${userId}: ${followingResponse.status}`);
          // Не прерываем выполнение, просто оставляем 0
        }
    } catch (followingError) {
         console.error(`API user: Ошибка при запросе количества подписок для ${userId}:`, followingError);
         // Не прерываем выполнение, просто оставляем 0
    }

    // 5. Возвращаем данные пользователя
    console.log(`API user: Успешно получены данные для ${userData.login}`);
    return NextResponse.json(userData);

  } catch (error) {
    console.error('API user: Внутренняя ошибка сервера:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
} 