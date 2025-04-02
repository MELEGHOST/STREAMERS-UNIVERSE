import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('[/api/twitch/user] Начало обработки запроса');
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Получаем текущую сессию
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('[/api/twitch/user] Ошибка при получении сессии:', sessionError);
      return NextResponse.json({ error: 'Ошибка аутентификации' }, { status: 401 });
    }

    if (!session) {
      console.log('[/api/twitch/user] Сессия не найдена');
      return NextResponse.json({ error: 'Требуется аутентификация' }, { status: 401 });
    }

    console.log('[/api/twitch/user] Сессия найдена, проверяем данные пользователя');

    // Получаем данные пользователя
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('[/api/twitch/user] Ошибка при получении данных пользователя:', userError);
      return NextResponse.json({ error: 'Ошибка получения данных пользователя' }, { status: 401 });
    }

    if (!user) {
      console.log('[/api/twitch/user] Пользователь не найден');
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 401 });
    }

    console.log('[/api/twitch/user] Данные пользователя получены:', {
      id: user.id,
      email: user.email,
      hasProviderToken: !!user.identities?.[0]?.identity_data?.provider_token,
      hasTwitchUserId: !!user.identities?.[0]?.identity_data?.provider_id
    });

    // Проверяем наличие provider_token в метаданных
    const providerToken = user.identities?.[0]?.identity_data?.provider_token;
    const twitchUserId = user.identities?.[0]?.identity_data?.provider_id;

    if (!providerToken || !twitchUserId) {
      console.log('[/api/twitch/user] Отсутствует provider_token или twitchUserId в метаданных пользователя');
      return NextResponse.json({ error: 'Отсутствуют необходимые данные Twitch' }, { status: 401 });
    }

    // Получаем данные из Twitch API
    const twitchResponse = await fetch(`https://api.twitch.tv/helix/users?id=${twitchUserId}`, {
      headers: {
        'Authorization': `Bearer ${providerToken}`,
        'Client-Id': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID
      }
    });

    if (!twitchResponse.ok) {
      console.error('[/api/twitch/user] Ошибка при запросе к Twitch API:', await twitchResponse.text());
      return NextResponse.json({ error: 'Ошибка получения данных Twitch' }, { status: 401 });
    }

    const twitchData = await twitchResponse.json();
    const userData = twitchData.data[0];

    if (!userData) {
      console.log('[/api/twitch/user] Данные не найдены в ответе Twitch API');
      return NextResponse.json({ error: 'Данные пользователя не найдены' }, { status: 404 });
    }

    console.log('[/api/twitch/user] Данные успешно получены от Twitch API');
    return NextResponse.json(userData);

  } catch (error) {
    console.error('[/api/twitch/user] Критическая ошибка:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
} 