import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import axios from 'axios';
import { createServerClient } from '@supabase/ssr';

export async function GET(/* request */) {
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

    // 2. Получаем ID текущего пользователя (broadcaster_id)
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      console.error('API refresh-followers: Не удалось получить пользователя из сессии Supabase', userError);
      return NextResponse.json({ error: 'Не удалось определить пользователя' }, { status: 401 });
    }
    const userId = user.user_metadata?.provider_id; // Twitch ID пользователя
    if (!userId) {
      console.error('API refresh-followers: Не удалось получить provider_id пользователя из сессии');
      return NextResponse.json({ error: 'Не удалось получить Twitch ID пользователя' }, { status: 500 });
    }

    // 3. Проверяем Client ID
    const TWITCH_CLIENT_ID = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
    if (!TWITCH_CLIENT_ID) {
      console.error('API refresh-followers: TWITCH_CLIENT_ID отсутствует');
      return NextResponse.json({ error: 'Ошибка конфигурации сервера' }, { status: 500 });
    }

    console.log(`API refresh-followers: Запрос фолловеров для ${userId}`);

    // 4. Запрашиваем первую страницу фолловеров с Twitch API
    // (Этот эндпоинт, вероятно, не для ПОЛНОГО обновления, а для получения последней страницы)
    // Используем axios как в оригинале, но можно и fetch
    const response = await axios.get(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${userId}&first=100`, {
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`
      }
    });

    // 5. Форматируем данные для клиента
    const followers = response.data.data.map(follower => ({
      id: follower.user_id,      // Используем правильные поля из /channels/followers
      login: follower.user_login,
      name: follower.user_name,
      followedAt: follower.followed_at,
    }));
    
    // 6. Возвращаем данные
    return NextResponse.json({
      success: true,
      followers,
      total: response.data.total || followers.length,
      pagination: response.data.pagination, // Добавляем пагинацию, если нужна клиенту
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('API refresh-followers: Ошибка при обновлении фолловеров:', error);
    
    // Обработка ошибок axios
    if (error.response) {
      // Ошибка от Twitch API
      console.error('Twitch API Error:', error.response.status, error.response.data);
      if (error.response.status === 401) {
        return NextResponse.json({ 
          error: 'Токен недействителен', 
          message: error.response.data?.message || 'Срок действия токена истек или он был отозван.',
          success: false
        }, { status: 401 });
      }
      return NextResponse.json({ 
        error: 'Ошибка Twitch API', 
        message: error.response.data?.message || `Статус: ${error.response.status}`,
        success: false
      }, { status: error.response.status });
    } else if (error.request) {
      // Ошибка сети (запрос был сделан, но ответ не получен)
      console.error('Network Error:', error.request);
      return NextResponse.json({ 
        error: 'Ошибка сети', 
        message: 'Не удалось связаться с Twitch API.',
        success: false
      }, { status: 502 }); // Bad Gateway
    } else {
      // Другая ошибка (например, при обработке данных)
      console.error('Generic Error:', error.message);
    }
    
    // Общая ошибка сервера
    return NextResponse.json({ 
      error: 'Ошибка сервера', 
      message: error.message || 'Произошла неизвестная ошибка.',
      success: false
    }, { status: 500 });
  }
} 