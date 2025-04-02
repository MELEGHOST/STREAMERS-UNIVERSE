import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('[/api/twitch/user] Начало обработки запроса');
    const cookieStore = cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll: () => {
            const allCookies = cookieStore.getAll();
            return allCookies.map(({ name, value }) => ({ name, value }));
          },
          setAll: (cookiesToSet) => {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
            } catch (error) {
              console.warn(`[/api/twitch/user] Ошибка установки cookies:`, error);
            }
          },
          remove: (name, options) => {
            try {
              cookieStore.set({ name, value: '', ...options, maxAge: 0 });
            } catch (error) {
              console.warn(`[/api/twitch/user] Ошибка удаления cookie '${name}':`, error);
            }
          },
        },
      }
    );

    // Сначала getUser для валидации аутентификации
    console.log('[/api/twitch/user] Вызов supabase.auth.getUser()...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('[/api/twitch/user] Ошибка при getUser():', userError);
      return NextResponse.json({ error: 'Ошибка аутентификации (getUser)' }, { status: 401 });
    }

    if (!user) {
      console.log('[/api/twitch/user] Пользователь не найден после getUser()');
      return NextResponse.json({ error: 'Пользователь не аутентифицирован (getUser)' }, { status: 401 });
    }

    console.log('[/api/twitch/user] getUser() успешен, ID пользователя:', user.id);

    // Теперь, когда мы знаем, что пользователь аутентифицирован, попробуем получить сессию
    console.log('[/api/twitch/user] Вызов supabase.auth.getSession() ПОСЛЕ успешного getUser()...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('[/api/twitch/user] Ошибка при getSession() ПОСЛЕ getUser():', sessionError);
      // Если getUser успешен, но getSession нет, это странно, но вернем ошибку
      return NextResponse.json({ error: 'Ошибка получения сессии после getUser()' }, { status: 500 });
    }

    if (!session) {
      console.log('[/api/twitch/user] Сессия НЕ найдена после getSession() (даже после успешного getUser())');
      // Это очень странная ситуация, указывающая на проблему с cookie или состоянием
      return NextResponse.json({ error: 'Не удалось получить сессию, несмотря на аутентификацию' }, { status: 401 });
    }

    console.log('[/api/twitch/user] Сессия успешно получена ПОСЛЕ getUser()');

    // Пытаемся получить токен и ID из разных источников
    const providerTokenFromSession = session.provider_token;
    const providerTokenFromUserIdentity = user.identities?.[0]?.identity_data?.provider_token;
    const twitchUserIdFromSession = session.user?.user_metadata?.provider_id; // Менее надежно
    const twitchUserIdFromUserIdentity = user.identities?.[0]?.identity_data?.provider_id; // Предпочтительно

    // Выбираем лучший источник
    const providerToken = providerTokenFromSession || providerTokenFromUserIdentity;
    const twitchUserId = twitchUserIdFromUserIdentity || twitchUserIdFromSession;

    console.log('[/api/twitch/user] Проверка токенов и ID:', {
        hasTokenSession: !!providerTokenFromSession,
        hasTokenIdentity: !!providerTokenFromUserIdentity,
        hasIdSession: !!twitchUserIdFromSession,
        hasIdIdentity: !!twitchUserIdFromUserIdentity,
        finalTokenSelected: !!providerToken,
        finalIdSelected: !!twitchUserId
    });

    if (!providerToken || !twitchUserId) {
      console.error('[/api/twitch/user] КРИТИЧЕСКАЯ ОШИБКА: Отсутствует provider_token или twitchUserId даже после проверки session и user identity!');
      return NextResponse.json({ error: 'Отсутствуют необходимые данные Twitch в сессии' }, { status: 401 });
    }

    // Получаем данные из Twitch API
    console.log(`[/api/twitch/user] Запрос к Twitch API для пользователя ${twitchUserId}...`);
    const twitchResponse = await fetch(`https://api.twitch.tv/helix/users?id=${twitchUserId}`, {
      headers: {
        'Authorization': `Bearer ${providerToken}`,
        'Client-Id': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID // Используем PUBLIC ключ, если это API route, доступный клиенту
      }
    });

    if (!twitchResponse.ok) {
      const errorBody = await twitchResponse.text();
      console.error(`[/api/twitch/user] Ошибка при запросе к Twitch API (${twitchResponse.status}):`, errorBody);
      // Здесь можно добавить логику обновления токена, если есть refresh_token
      return NextResponse.json({ error: `Ошибка получения данных Twitch (${twitchResponse.status})` }, { status: twitchResponse.status });
    }

    const twitchData = await twitchResponse.json();
    const userData = twitchData.data[0];

    if (!userData) {
      console.log('[/api/twitch/user] Данные не найдены в ответе Twitch API для ID:', twitchUserId);
      return NextResponse.json({ error: 'Данные пользователя Twitch не найдены' }, { status: 404 });
    }

    console.log('[/api/twitch/user] Данные успешно получены от Twitch API для пользователя:', userData.login);
    return NextResponse.json(userData);

  } catch (error) {
    console.error('[/api/twitch/user] Критическая ошибка в обработчике:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

// Добавляем динамическую обработку, чтобы Vercel не кэшировал маршрут
export const dynamic = 'force-dynamic'; 