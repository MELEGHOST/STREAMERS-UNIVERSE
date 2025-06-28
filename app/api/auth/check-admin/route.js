import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const cookieStore = cookies();
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.error('[check-admin] Ошибка сессии или сессия отсутствует:', sessionError?.message);
      return NextResponse.json({ isAdmin: false, role: 'user', error: 'Нет активной сессии' }, { status: 401 });
    }

    const user = session.user;
    const userTwitchId = user?.user_metadata?.provider_id;

    if (!userTwitchId) {
        console.error('[check-admin] Не удалось получить provider_id (Twitch ID) из метаданных пользователя.');
        return NextResponse.json({ isAdmin: false, role: 'user', error: 'Не удалось определить Twitch ID пользователя.' }, { status: 400 });
    }
    
    // --- ЕДИНЫЙ ИСТОЧНИК ПРАВДЫ ---
    // Делаем внутренний запрос к нашему же API, чтобы получить профиль
    // Это гарантирует, что логика получения роли будет консистентной по всему приложению.
    const internalUrl = new URL(request.url);
    const profileApiUrl = `${internalUrl.origin}/api/twitch/user?userId=${userTwitchId}&fetchProfile=true`;

    const response = await fetch(profileApiUrl, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`, // Передаем токен для авторизации
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[check-admin] Внутренний запрос к /api/twitch/user провалился со статусом ${response.status}:`, errorText);
        return NextResponse.json({ isAdmin: false, role: 'user', error: `Ошибка получения данных профиля: ${response.statusText}` }, { status: response.status });
    }

    const apiData = await response.json();

    // Извлекаем роль из вложенного объекта 'profile'
    const userRole = apiData?.profile?.role || 'user';
    const isAdmin = userRole === 'admin' || userRole.includes('admin');

    console.log(`[check-admin] Роль для пользователя ${user.email} (${userTwitchId}): ${userRole}. Админ: ${isAdmin}`);
    
    return NextResponse.json({ isAdmin, role: userRole });

  } catch (e) {
    console.error('[check-admin] Критическая ошибка в обработчике:', e.message);
    return NextResponse.json({ isAdmin: false, role: 'user', error: `Внутренняя ошибка сервера: ${e.message}` }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic'; 