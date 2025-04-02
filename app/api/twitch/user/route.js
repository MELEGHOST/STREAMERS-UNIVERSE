import { NextResponse } from 'next/server';
// import { cookies } from 'next/headers'; // Не используется напрямую
import { createServerClient } from '@supabase/ssr'; // Используем SSR клиент

export async function GET(request) {
  const response = new NextResponse();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: (name, value, options) => response.cookies.set({ name, value, ...options, sameSite: options.sameSite || 'Lax', path: '/' }),
        remove: (name, options) => response.cookies.set({ name, value: '', ...options, sameSite: options.sameSite || 'Lax', path: '/' }),
      },
    }
  );

  try {
    // Используем getUser() для получения и верификации сессии с сервером Supabase
    // const { data: { session }, error: sessionError } = await supabase.auth.getSession(); // Заменяем
    const { data: userDataAuth, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.error('/api/twitch/user: Ошибка получения/проверки пользователя Supabase (getUser):', userError);
      // Если ошибка связана с отсутствием сессии, возвращаем 401
      if (userError.message.includes('Auth session missing') || userError.status === 401) {
         return NextResponse.json({ error: 'Пользователь не аутентифицирован (getUser)' }, { status: 401 });
      }
      // Другие ошибки getUser
      return NextResponse.json({ error: 'Ошибка сервера при проверке сессии (getUser)' }, { status: 500 });
    }

    if (!userDataAuth || !userDataAuth.user) {
      console.log('/api/twitch/user: Пользователь не аутентифицирован (getUser вернул null)');
      return NextResponse.json({ error: 'Пользователь не аутентифицирован (getUser)' }, { status: 401 });
    }
    
    // Получаем сессию из данных пользователя для доступа к provider_token
    // Важно: getUser() возвращает пользователя, но нам все еще может понадобиться сессия для provider_token
    // Мы можем снова вызвать getSession() *после* успешного getUser(), 
    // так как теперь мы уверены, что куки валидны (раз getUser() сработал).
    // Или, возможно, provider_token уже где-то сохранен/доступен? 
    // Проверим структуру userDataAuth.user
    // console.log('Структура userDataAuth.user:', userDataAuth.user); 
    // provider_token обычно находится в объекте сессии, а не пользователя.
    
    // Поэтому, после успешного getUser(), мы можем безопасно получить сессию из кук.
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
        console.error('/api/twitch/user: Ошибка получения сессии ПОСЛЕ успешного getUser() или сессия null:', sessionError);
        // Это не должно происходить, если getUser() успешен, но добавим проверку
        return NextResponse.json({ error: 'Ошибка получения данных сессии после аутентификации' }, { status: 500 });
    }

    // Теперь используем session, полученную ПОСЛЕ валидации через getUser()
    const providerToken = session.provider_token;
    const providerRefreshToken = session.provider_refresh_token;
    const twitchUserId = session.user?.user_metadata?.provider_id; // Можно взять из session.user

    if (!providerToken || !twitchUserId) {
      console.error('/api/twitch/user: Отсутствует provider_token или twitchUserId в сессии (после getUser)');
      // Если getUser успешен, но в сессии нет токенов, это проблема конфигурации/логина
      return NextResponse.json({ error: 'Неполные данные аутентификации Twitch в сессии' }, { status: 401 });
    }
    
    // Переменная для хранения актуального токена
    let currentProviderToken = providerToken; 

    console.log('/api/twitch/user: Сессия найдена, ID пользователя Twitch:', twitchUserId);

    let userData = {};
    let followersCount = null;
    let twitchResponseStatus = null;

    try {
      // 1. Получаем основную информацию о пользователе Twitch
      console.log('/api/twitch/user: Запрос основной информации пользователя...');
      const userResponse = await fetch(`https://api.twitch.tv/helix/users?id=${twitchUserId}`, {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          // Используем актуальный токен
          'Authorization': `Bearer ${currentProviderToken}`, 
        },
      });

      twitchResponseStatus = userResponse.status;
      console.log('/api/twitch/user: Статус ответа от /users:', twitchResponseStatus);

      if (!userResponse.ok) {
        // ... (обработка ошибок /users, включая обновление токена, остается как есть) ...
        // Если ошибка 401/403, пытаемся обновить токен
        if (twitchResponseStatus === 401 || twitchResponseStatus === 403) {
          console.log('/api/twitch/user: Токен недействителен (401/403), попытка обновления...');
          if (!providerRefreshToken) {
            console.error('/api/twitch/user: Refresh токен отсутствует, не могу обновить.');
            await supabase.auth.signOut(); // Выходим из сессии Supabase
            return NextResponse.json({ error: 'Требуется повторная аутентификация Twitch (нет refresh токена)' }, { status: 401 });
          }

          try {
            const { data: refreshedSession, error: refreshError } = await supabase.auth.refreshSession({ refresh_token: providerRefreshToken });
            if (refreshError) {
              console.error('/api/twitch/user: Ошибка обновления сессии Supabase:', refreshError);
              await supabase.auth.signOut();
              return NextResponse.json({ error: 'Ошибка обновления сессии, требуется повторная аутентификация' }, { status: 401 });
            }
            if (!refreshedSession || !refreshedSession.session?.provider_token) { // Проверяем вложенность session
               console.error('/api/twitch/user: Обновленная сессия не содержит provider_token');
               await supabase.auth.signOut();
               return NextResponse.json({ error: 'Ошибка структуры обновленной сессии' }, { status: 401 });
            }

            // Обновляем актуальный токен
            currentProviderToken = refreshedSession.session.provider_token; 
            console.log('/api/twitch/user: Сессия успешно обновлена, повторный запрос к /users...');
            
            // Повторный запрос с НОВЫМ токеном
            const retryResponse = await fetch(`https://api.twitch.tv/helix/users?id=${twitchUserId}`, {
              headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID,
                // Используем обновленный токен
                'Authorization': `Bearer ${currentProviderToken}`, 
              },
            });

             console.log('/api/twitch/user: Статус ответа от /users после обновления:', retryResponse.status);

            if (!retryResponse.ok) {
              const errorBody = await retryResponse.text();
              console.error(`/api/twitch/user: Повторный запрос к /users не удался (${retryResponse.status}):`, errorBody);
              await supabase.auth.signOut(); // Если и после обновления ошибка, выходим
              return NextResponse.json({ error: `Ошибка Twitch API (${retryResponse.status}) после обновления токена` }, { status: retryResponse.status });
            }
            const retryData = await retryResponse.json();
            userData = retryData.data[0]; // Используем данные из повторного запроса

          } catch (refreshHandlingError) {
            console.error('/api/twitch/user: Ошибка при обработке обновления токена:', refreshHandlingError);
            await supabase.auth.signOut();
            return NextResponse.json({ error: 'Внутренняя ошибка сервера при обновлении токена' }, { status: 500 });
          }
        } else {
          // Другие ошибки Twitch API
          const errorBody = await userResponse.text();
          console.error(`/api/twitch/user: Ошибка Twitch API (${twitchResponseStatus}) при запросе /users:`, errorBody);
          return NextResponse.json({ error: `Ошибка Twitch API (${twitchResponseStatus})` }, { status: twitchResponseStatus });
        }
      } else {
         const data = await userResponse.json();
         if (!data.data || data.data.length === 0) {
            console.error('/api/twitch/user: Пользователь Twitch не найден по ID:', twitchUserId);
            return NextResponse.json({ error: 'Пользователь Twitch не найден' }, { status: 404 });
         }
         userData = data.data[0];
         console.log('/api/twitch/user: Основная информация пользователя получена успешно.');
      }

      // 2. Получаем количество подписчиков (только если userData успешно получены)
      if (userData && userData.id) {
          console.log('/api/twitch/user: Запрос количества подписчиков...');
          const followersResponse = await fetch(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${userData.id}`, {
              headers: {
                  'Client-ID': process.env.TWITCH_CLIENT_ID,
                  // Используем актуальный токен (изначальный или обновленный)
                  'Authorization': `Bearer ${currentProviderToken}` 
              },
          });

          console.log('/api/twitch/user: Статус ответа от /channels/followers:', followersResponse.status);

          if (followersResponse.ok) {
              const followersData = await followersResponse.json();
              followersCount = followersData.total;
              console.log('/api/twitch/user: Количество подписчиков получено:', followersCount);
          } else {
              // Не считаем критической ошибкой, если не удалось получить подписчиков
              const errorBody = await followersResponse.text();
              console.warn(`/api/twitch/user: Не удалось получить количество подписчиков (${followersResponse.status}):`, errorBody);
          }
      }

    } catch (fetchError) {
      // Ошибки сети или при парсинге JSON
      console.error('/api/twitch/user: Ошибка сети или парсинга при запросе к Twitch API:', fetchError);
      return NextResponse.json({ error: 'Ошибка сети при обращении к Twitch' }, { status: 502 }); // 502 Bad Gateway
    }

    // 3. Формируем и возвращаем объединенный ответ
    const resultData = {
      id: userData.id, // Twitch ID
      login: userData.login,
      display_name: userData.display_name,
      profile_image_url: userData.profile_image_url,
      description: userData.description,
      created_at: userData.created_at,
      // Добавляем тип канала и количество подписчиков
      broadcaster_type: userData.broadcaster_type,
      followers_count: followersCount, // Может быть null, если запрос не удался
    };

    console.log('/api/twitch/user: Успешное получение данных пользователя:', resultData.login);
    return NextResponse.json(resultData, { status: 200 });

  } catch (error) {
    // Глобальный обработчик ошибок (например, ошибки Supabase client)
    console.error('/api/twitch/user: Глобальная ошибка:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
} 