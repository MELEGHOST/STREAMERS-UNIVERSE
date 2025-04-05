import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userIdParam = searchParams.get('userId');
  const sessionCheck = searchParams.get('sessionCheck') === 'true'; // Преобразуем в boolean
  
  console.log(`[API] /api/twitch/user (v3 - User Token): начало, userIdParam=${userIdParam}, sessionCheck=${sessionCheck}`);
  
  const cookieStore = cookies();
  
  // Логируем все доступные куки
  const allCookies = cookieStore.getAll();
  console.log(`[API] /api/twitch/user: Доступные куки (${allCookies.length}):`, 
    allCookies.map(c => `${c.name}=${c.value?.substring(0, 20)}...`).join(', '));

  const twitch_user_data_cookie = cookieStore.get('twitch_user_data')?.value;
  const auth_successful_cookie = cookieStore.get('auth_successful')?.value;
  
  console.log(`[API] /api/twitch/user: Резервные куки: twitch_user_data=${!!twitch_user_data_cookie}, auth_successful=${auth_successful_cookie}`);
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) { 
             console.warn(`[API] /api/twitch/user: Ошибка установки куки ${name}:`, error);
          } 
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: '', ...options, maxAge: 0 });
          } catch (error) {
             console.warn(`[API] /api/twitch/user: Ошибка удаления куки ${name}:`, error);
          }
        },
      },
    }
  );
  
  let session = null;
  let authUser = null;
  let providerToken = null;
  let sessionError = null;
  
  try {
    // Попытка получить сессию
    console.log('[API] /api/twitch/user: Попытка получить сессию Supabase...');
    const { data, error } = await supabase.auth.getSession();
    session = data?.session;
    sessionError = error;
    
    if (sessionError) {
      console.warn('[API] /api/twitch/user: Ошибка при getSession():', sessionError.message);
    } else if (session) {
      console.log('[API] /api/twitch/user: Сессия Supabase найдена, user ID:', session.user.id);
      authUser = session.user; // Сохраняем пользователя из сессии
      providerToken = session.provider_token;
    } else {
      console.log('[API] /api/twitch/user: Сессия Supabase НЕ найдена через getSession().');
    }
    
    // Дополнительная попытка получить пользователя через getUser, если сессии нет
    if (!authUser) {
      console.log('[API] /api/twitch/user: Попытка получить пользователя через getUser()...');
      const { data: userData, error: getUserError } = await supabase.auth.getUser();
      if (getUserError) {
         console.warn('[API] /api/twitch/user: Ошибка при getUser():', getUserError.message);
      } else if (userData?.user) {
         console.log('[API] /api/twitch/user: Пользователь найден через getUser(), ID:', userData.user.id);
         authUser = userData.user;
      } else {
         console.log('[API] /api/twitch/user: Пользователь НЕ найден через getUser().');
      }
    }

  } catch (e) {
    console.error('[API] /api/twitch/user: Критическая ошибка при работе с Supabase Auth:', e);
    sessionError = e; // Сохраняем ошибку
  }

  // --- Логика обработки --- 

  // Если это проверка сессии, и нет ни пользователя, ни резервных данных
  if (sessionCheck) {
    if (!authUser && !(twitch_user_data_cookie && auth_successful_cookie === 'true')) {
        console.log('[API] /api/twitch/user: Проверка сессии НЕ пройдена (нет authUser и резервных cookie).');
        return NextResponse.json({ error: 'Пользователь не авторизован' }, { status: 401 });
    } else if (authUser) {
        console.log('[API] /api/twitch/user: Проверка сессии УСПЕШНА (authUser найден).');
        // Если проверка успешна, возвращаем данные пользователя из сессии
        const twitchId = authUser.user_metadata?.provider_id || authUser.id;
        return NextResponse.json({
           id: authUser.id, // UUID
           twitchId: twitchId, // Twitch ID
           login: authUser.user_metadata?.preferred_username || authUser.user_metadata?.full_name,
           display_name: authUser.user_metadata?.full_name,
           profile_image_url: authUser.user_metadata?.avatar_url
        });
    } else {
        // Используем резервные данные, если сессии нет, но есть cookie
        try {
          const parsedCookieData = JSON.parse(twitch_user_data_cookie);
          console.log('[API] /api/twitch/user: Проверка сессии УСПЕШНА (используем резервные cookie).');
          return NextResponse.json(parsedCookieData);
        } catch(cookieErr) {
          console.error('[API] /api/twitch/user: Ошибка парсинга резервных cookie при проверке сессии:', cookieErr);
          return NextResponse.json({ error: 'Ошибка обработки резервной сессии' }, { status: 500 });
        }
    }
  }

  // --- Если это НЕ проверка сессии, а запрос данных --- 

  let targetUserId = userIdParam; // ID пользователя, чьи данные запрашиваем
  let requestingUserId = null; // ID пользователя, который делает запрос (если он авторизован)
  let requestingUserTwitchId = null; // Twitch ID пользователя, который делает запрос

  if (authUser) {
    requestingUserId = authUser.id;
    requestingUserTwitchId = authUser.user_metadata?.provider_id || authUser.id;
    console.log(`[API] /api/twitch/user: Запрос от авторизованного пользователя ${requestingUserId} (Twitch: ${requestingUserTwitchId})`);
  }

  // Если userId не передан в параметрах, используем ID авторизованного пользователя
  if (!targetUserId && authUser) {
    targetUserId = requestingUserTwitchId; // Используем Twitch ID
    console.log(`[API] /api/twitch/user: userId не указан, используем Twitch ID авторизованного пользователя: ${targetUserId}`);
  }
  
  // Если ID для запроса так и не определен, возвращаем ошибку
  if (!targetUserId) {
    console.error('[API] /api/twitch/user: Не удалось определить targetUserId для запроса данных Twitch.');
    // Проверяем, есть ли резервные данные
    if (twitch_user_data_cookie) {
       try {
          const parsedCookieData = JSON.parse(twitch_user_data_cookie);
          console.log('[API] /api/twitch/user: targetUserId не определен, возвращаем данные из резервных cookie.');
          return NextResponse.json(parsedCookieData);
       } catch (_error) { /* игнорируем ошибку парсинга здесь */ }
    }
    return NextResponse.json({ error: 'Не указан ID пользователя для запроса' }, { status: 400 });
  }

  // --- Получение данных из Twitch API --- 
  try {
    const cachedDataKey = `twitch_user_${targetUserId}`;
    const cachedDataCookie = cookieStore.get(cachedDataKey)?.value;

    if (cachedDataCookie) {
      try {
        const parsedData = JSON.parse(cachedDataCookie);
        const cacheTime = parsedData._cacheTime;
        if (cacheTime && Date.now() - cacheTime < 15 * 60 * 1000) {
          console.log(`[API] /api/twitch/user: Возвращаем кэшированные данные для targetUserId: ${targetUserId}`);
          return NextResponse.json(parsedData);
        }
      } catch (_error) {
        console.error('[API] /api/twitch/user: Ошибка парсинга кэша:', _error);
      }
    }

    // Запрос к Twitch API
    console.log(`[API] /api/twitch/user: Запрос к Twitch API для пользователя ${targetUserId}...`);
    // ПРОВЕРЬТЕ, что переменная TWITCH_APP_ACCESS_TOKEN установлена!
    const appAccessToken = process.env.TWITCH_APP_ACCESS_TOKEN;
    if (!appAccessToken) {
       console.error('[API] /api/twitch/user: Отсутствует TWITCH_APP_ACCESS_TOKEN!');
       return NextResponse.json({ error: 'Ошибка конфигурации сервера (нет токена приложения)' }, { status: 500 });
    }
    
    const twitchResponse = await fetch(`https://api.twitch.tv/helix/users?id=${targetUserId}`, {
      headers: {
        'Authorization': `Bearer ${providerToken}`,
        'Client-Id': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID
      }
    });

    if (!twitchResponse.ok) {
      const errorText = await twitchResponse.text();
      console.error('[API] /api/twitch/user: Ошибка запроса к Twitch API:', twitchResponse.status, errorText);
      // Возвращаем устаревший кэш, если он есть
      if (cachedDataCookie) {
         try {
           const parsedData = JSON.parse(cachedDataCookie);
           console.log('[API] /api/twitch/user: Ошибка Twitch API, возвращаем устаревшие кэшированные данные');
           return NextResponse.json(parsedData);
         } catch (_error) {/* игнор */} 
      }
      return NextResponse.json({ error: `Ошибка Twitch API: ${twitchResponse.status}` }, { status: 502 }); // Bad Gateway
    }

    const twitchData = await twitchResponse.json();
    if (!twitchData.data || twitchData.data.length === 0) {
      console.error(`[API] /api/twitch/user: Пользователь ${targetUserId} не найден в Twitch API.`);
      return NextResponse.json({ error: 'Пользователь Twitch не найден' }, { status: 404 });
    }

    const userData = twitchData.data[0];
    userData._cacheTime = Date.now();

    // Сохраняем в cookie кэш
    cookieStore.set(cachedDataKey, JSON.stringify(userData), {
      maxAge: 15 * 60, path: '/', sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    });

    console.log(`[API] /api/twitch/user: Успешно получены данные для ${userData.display_name} (${targetUserId})`);
    return NextResponse.json(userData);

  } catch (error) {
    console.error('[API] /api/twitch/user: Критическая ошибка при получении данных Twitch:', error);
    // Используем резервные данные, если они есть
    if (twitch_user_data_cookie) {
       try {
          const parsedCookieData = JSON.parse(twitch_user_data_cookie);
          console.log('[API] /api/twitch/user: Критическая ошибка, возвращаем данные из резервных cookie.');
          return NextResponse.json(parsedCookieData);
       } catch (_error) { /* игнорируем ошибку парсинга здесь */ }
    }
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic'; 