import { NextResponse } from 'next/server';
// import { cookies } from 'next/headers'; // Больше не используем напрямую
import { createServerClient } from '@supabase/ssr'; // Используем SSR клиент
import { cookies } from 'next/headers'; // Нужен для createServerClient
// import supabase from '@/lib/supabaseClient'; // Удаляем неиспользуемый импорт

// Вспомогательная функция для получения деталей пользователей (оставляем как есть, но будем передавать токен)
async function fetchUsersDetails(userIds, accessToken, clientId) {
    if (!userIds || userIds.length === 0) return [];
    try {
        const response = await fetch(`https://api.twitch.tv/helix/users?id=${userIds.join('&id=')}`, {
            headers: {
                'Client-ID': clientId,
                'Authorization': `Bearer ${accessToken}`
            }
        });
        if (!response.ok) {
            console.error('Ошибка при получении деталей пользователей Twitch:', response.status);
            return [];
        }
        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error('Ошибка сети при получении деталей пользователей Twitch:', error);
        return [];
    }
}

// Вспомогательная функция для получения зарегистрированных пользователей SU
// Изменяем: добавляем supabaseClient как аргумент
async function getRegisteredUsers(supabaseClient, twitchIds) { 
    if (!twitchIds || twitchIds.length === 0) return [];
    try {
        // Используем переданный supabaseClient
        const { data, error } = await supabaseClient 
            .from('users')
            .select('twitchId, userType') // Выбираем только нужные поля
            .in('twitchId', twitchIds);
        
        if (error) {
            console.error('Ошибка при получении зарегистрированных пользователей SU:', error);
            return [];
        }
        return data || [];
    } catch (error) {
        console.error('Критическая ошибка при получении зарегистрированных пользователей SU:', error);
        return [];
    }
}


export async function GET(request) {
  const cookieStore = cookies(); // Получаем cookie store
  // Создаем SSR-клиент Supabase
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
    // 1. Проверяем сессию Supabase и получаем токен Twitch
    const { data: { session }, error: sessionError } = await supabaseAuth.auth.getSession();

    if (sessionError || !session) {
        console.error('API user-followers: Ошибка сессии или сессия отсутствует', sessionError);
        return NextResponse.json({ error: 'Необходима аутентификация' }, { status: 401 });
    }

    const accessToken = session.provider_token; // Токен доступа Twitch из сессии Supabase
    if (!accessToken) {
        console.error('API user-followers: Отсутствует provider_token в сессии Supabase');
        return NextResponse.json({ error: 'Не удалось получить токен доступа Twitch из сессии' }, { status: 401 });
    }

    // 2. Получаем параметры запроса
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId'); // ID пользователя, чьих фолловеров смотрим
    const limit = parseInt(url.searchParams.get('limit') || '100', 10); // Лимит ( Twitch max 100)
    const cursor = url.searchParams.get('after'); // Курсор для пагинации

    if (!userId) {
      return NextResponse.json({ error: 'Требуется ID пользователя (userId)' }, { status: 400 });
    }
    
    const TWITCH_CLIENT_ID = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
    if (!TWITCH_CLIENT_ID) {
      console.error('API user-followers: TWITCH_CLIENT_ID отсутствует в переменных окружения');
      return NextResponse.json({ error: 'Ошибка конфигурации сервера' }, { status: 500 });
    }
    
    console.log(`API user-followers: Запрос фолловеров для ${userId}, лимит ${limit}, курсор ${cursor}`);
    
    // 3. Запрос к Twitch API с использованием /channels/followers
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const twitchApiUrl = new URL('https://api.twitch.tv/helix/channels/followers');
    twitchApiUrl.searchParams.append('broadcaster_id', userId);
    twitchApiUrl.searchParams.append('first', Math.min(limit, 100).toString()); // Убедимся, что не больше 100
    if (cursor) {
        twitchApiUrl.searchParams.append('after', cursor);
    }

    try {
      const response = await fetch(twitchApiUrl.toString(), {
        headers: {
          'Client-ID': TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${accessToken}` // Используем токен из сессии Supabase
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API user-followers: Ошибка Twitch API ${response.status}`, errorText);
        // Возвращаем статус ошибки от Twitch
        return NextResponse.json({ 
          error: 'Ошибка при получении фолловеров от Twitch',
          details: errorText 
        }, { status: response.status }); 
      }
      
      const data = await response.json();
      const nextCursor = data.pagination?.cursor; // Получаем курсор для следующей страницы

      console.log(`API user-followers: Получено ${data.data?.length || 0} фолловеров из ${data.total}`);
      
      if (!data.data || !Array.isArray(data.data)) {
        return NextResponse.json({ total: data.total || 0, followers: [], pagination: {} });
      }
      
      // 4. Получаем доп. информацию (детали пользователей Twitch и регистрацию в SU)
      const followerIds = data.data.map(follower => follower.user_id);
      const [usersInfo, registeredUsers] = await Promise.all([
          fetchUsersDetails(followerIds, accessToken, TWITCH_CLIENT_ID),
          // Передаем supabaseAuth в getRegisteredUsers
          getRegisteredUsers(supabaseAuth, followerIds) 
      ]);
      
      // 5. Форматируем ответ
      const followers = data.data.map(follower => {
        const userInfo = usersInfo.find(user => user.id === follower.user_id) || {};
        const isRegistered = registeredUsers.some(ru => ru.twitchId === follower.user_id);
        const userType = registeredUsers.find(ru => ru.twitchId === follower.user_id)?.userType || 'viewer';
        
        return {
          id: follower.user_id,
          name: follower.user_name || follower.user_login, // Используем user_name из /channels/followers
          login: follower.user_login,
          followedAt: follower.followed_at, // Поле из /channels/followers
          profileImageUrl: userInfo.profile_image_url || '', // Детали берем из /users
          broadcasterType: userInfo.broadcaster_type || '',
          isRegisteredOnSU: isRegistered,
          suUserType: userType
        };
      });
      
      return NextResponse.json({
        total: data.total,
        followers: followers,
        pagination: {
            cursor: nextCursor
        }
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('API user-followers: Запрос к Twitch API превысил время ожидания');
        // Возвращаем ошибку 504 Gateway Timeout
        return NextResponse.json({ error: 'Таймаут запроса к Twitch API' }, { status: 504 });
      }
      // Передаем другие ошибки fetch дальше
      throw fetchError; 
    }
  } catch (error) {
    // Общая обработка ошибок (включая ошибки Supabase Auth, fetch)
    console.error('API user-followers: Внутренняя ошибка сервера:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
} 