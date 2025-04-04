import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const sessionCheck = searchParams.get('sessionCheck');
  
  console.log(`[API] /api/twitch/user: начало обработки запроса, userId=${userId}, sessionCheck=${sessionCheck}`);
  
  // Получаем объект cookies
  const cookieStore = cookies();
  
  // Проверяем наличие резервных cookie, которые мы добавили в обработчик callback
  const twitch_user_data = cookieStore.get('twitch_user_data')?.value;
  const auth_successful = cookieStore.get('auth_successful')?.value;
  
  // Создаем клиента Supabase
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
  
  try {
    // Получаем сессию Supabase
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('[API] /api/twitch/user: ошибка получения сессии Supabase:', sessionError.message);
    }
    
    // Если запрашивается проверка сессии, то проверяем наличие активной сессии
    if (sessionCheck === 'true' && !session) {
      console.log('[API] /api/twitch/user: проверка сессии - пользователь не авторизован');
      
      // Проверяем наличие резервных cookie
      if (twitch_user_data && auth_successful === 'true') {
        try {
          // Используем данные из резервной cookie
          const userData = JSON.parse(twitch_user_data);
          console.log('[API] /api/twitch/user: используем данные из резервной cookie:', 
            { id: userData.id, twitchId: userData.twitchId });
          
          return NextResponse.json(userData);
        } catch (cookieError) {
          console.error('[API] /api/twitch/user: ошибка чтения данных из cookie:', cookieError);
        }
      }
      
      // Если нет сессии, возвращаем 401
      return NextResponse.json(
        { error: 'Пользователь не авторизован' },
        { status: 401 }
      );
    }

    // Пытаемся получить данные пользователя из Supabase
    let user = null;
    let twitchId = null;
    
    // Если у нас есть userId из параметра запроса, используем его
    if (userId) {
      console.log(`[API] /api/twitch/user: используем указанный userId: ${userId}`);
      twitchId = userId;
    } 
    // Если есть активная сессия, получаем пользователя из сессии
    else if (session) {
      const { data: userData } = await supabase.auth.getUser();
      user = userData?.user;
      
      if (user) {
        console.log(`[API] /api/twitch/user: получен пользователь из сессии, id: ${user.id}`);
        twitchId = user.user_metadata?.provider_id || user.id;
      }
    }
    // Если нет ни userId, ни сессии, но есть резервные данные
    else if (twitch_user_data) {
      try {
        const userData = JSON.parse(twitch_user_data);
        twitchId = userData.twitchId || userData.id;
        console.log(`[API] /api/twitch/user: используем twitchId из резервных данных: ${twitchId}`);
      } catch (e) {
        console.error('[API] /api/twitch/user: ошибка при парсинге данных из cookie:', e);
      }
    }
    
    // Если не удалось определить twitchId, возвращаем ошибку
    if (!twitchId) {
      console.error('[API] /api/twitch/user: не удалось определить twitchId');
      return NextResponse.json(
        { error: 'Не удалось получить идентификатор пользователя' },
        { status: 400 }
      );
    }
    
    // Получение кэшированных данных из cookie
    const cachedDataKey = `twitch_user_${twitchId}`;
    const cachedData = cookieStore.get(cachedDataKey)?.value;
    
    if (cachedData) {
      try {
        const parsedData = JSON.parse(cachedData);
        const cacheTime = parsedData._cacheTime;
        
        // Проверяем, не устарел ли кэш (15 минут)
        if (cacheTime && Date.now() - cacheTime < 15 * 60 * 1000) {
          console.log(`[API] /api/twitch/user: возвращаем кэшированные данные для twitchId: ${twitchId}`);
          return NextResponse.json(parsedData);
        }
      } catch (e) {
        console.error('[API] /api/twitch/user: ошибка при работе с кэшем:', e);
      }
    }
    
    // Если twitchId есть, делаем запрос к Twitch API
    const twitchResponse = await fetch(`https://api.twitch.tv/helix/users?id=${twitchId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.TWITCH_APP_ACCESS_TOKEN}`,
        'Client-Id': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID
      }
    });
    
    if (!twitchResponse.ok) {
      console.error('[API] /api/twitch/user: ошибка запроса к Twitch API:', 
        await twitchResponse.text());
        
      // Возвращаем данные из кэша, если они есть, даже если они устарели
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          console.log('[API] /api/twitch/user: возвращаем устаревшие кэшированные данные');
          return NextResponse.json(parsedData);
        } catch (e) {
          console.error('[API] /api/twitch/user: ошибка при работе с устаревшим кэшем:', e);
        }
      }
      
      return NextResponse.json(
        { error: 'Ошибка при запросе к Twitch API' },
        { status: twitchResponse.status }
      );
    }
    
    const twitchData = await twitchResponse.json();
    
    if (!twitchData.data || twitchData.data.length === 0) {
      console.error('[API] /api/twitch/user: пользователь не найден в Twitch API');
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }
    
    const userData = twitchData.data[0];
    
    // Добавляем время кэширования и сохраняем в cookie
    userData._cacheTime = Date.now();
    
    // Устанавливаем cookie с данными пользователя (на 15 минут)
    cookieStore.set(cachedDataKey, JSON.stringify(userData), {
      maxAge: 15 * 60, // 15 минут
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    
    console.log(`[API] /api/twitch/user: успешно получены данные пользователя Twitch: ${userData.display_name} (${userData.id})`);
    return NextResponse.json(userData);
    
  } catch (error) {
    console.error('[API] /api/twitch/user: критическая ошибка:', error);
    
    // В случае критической ошибки используем резервные данные из cookie, если они есть
    if (twitch_user_data) {
      try {
        const userData = JSON.parse(twitch_user_data);
        console.log('[API] /api/twitch/user: возвращаем данные из резервной cookie после ошибки');
        return NextResponse.json(userData);
      } catch (e) {
        console.error('[API] /api/twitch/user: ошибка при парсинге резервных данных:', e);
      }
    }
    
    return NextResponse.json(
      { error: 'Ошибка сервера при получении данных пользователя' },
      { status: 500 }
    );
  }
}

// Делаем route динамическим, чтобы Vercel не кэшировал его
export const dynamic = 'force-dynamic'; 