import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    console.log('[/api/twitch/user] Начало обработки запроса (v2 - Edge Function)');
    const cookieStore = cookies();
    
    // Получаем параметры из URL
    const url = new URL(request.url);
    const requestedUserId = url.searchParams.get('userId');
    const sessionCheck = url.searchParams.get('sessionCheck') === 'true'; // Проверка, является ли запрос проверкой сессии
    
    // --- Клиент для проверки аутентификации пользователя --- 
    const supabaseAuthClient = createServerClient(
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

    // Создаем клиент Supabase для вызова Edge Function
    const supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // 1. Получаем аутентифицированного пользователя
    console.log('[/api/twitch/user] Вызов supabaseAuthClient.auth.getUser()...');
    const { data: { user }, error: userError } = await supabaseAuthClient.auth.getUser();
    
    // Определяем, какой userId будем использовать для запроса
    let targetUserId = null;
    
    if (userError) {
      console.error('[/api/twitch/user] Ошибка при getUser():', userError);
      
      // Если это проверка сессии, возвращаем ошибку аутентификации
      if (sessionCheck) {
        console.log('[/api/twitch/user] Запрос с sessionCheck=true, сессия отсутствует');
        return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
      }
      
      // Если сессия отсутствует, но есть параметр userId, используем его
      if (requestedUserId) {
        console.log(`[/api/twitch/user] Сессия отсутствует, но указан userId=${requestedUserId} в параметрах`);
        targetUserId = requestedUserId;
      } else {
        // Если нет ни сессии, ни userId в параметрах - возвращаем ошибку
        return NextResponse.json({ error: 'Ошибка аутентификации. Укажите userId в параметрах запроса' }, { status: 401 });
      }
    } else if (!user) {
      console.log('[/api/twitch/user] Пользователь не найден после getUser()');
      
      // Если это проверка сессии, возвращаем ошибку аутентификации
      if (sessionCheck) {
        console.log('[/api/twitch/user] Запрос с sessionCheck=true, пользователь не найден');
        return NextResponse.json({ error: 'Пользователь не аутентифицирован' }, { status: 401 });
      }
      
      // Если пользователь не найден, но есть параметр userId, используем его
      if (requestedUserId) {
        console.log(`[/api/twitch/user] Пользователь не найден, но указан userId=${requestedUserId} в параметрах`);
        targetUserId = requestedUserId;
      } else {
        return NextResponse.json({ error: 'Пользователь не аутентифицирован. Укажите userId в параметрах запроса' }, { status: 401 });
      }
    } else {
      console.log('[/api/twitch/user] getUser() успешен, ID пользователя:', user.id);
      
      // Если есть авторизованный пользователь, используем его ID или requestedUserId если он указан
      targetUserId = requestedUserId || user.id;
      console.log(`[/api/twitch/user] Используем ${requestedUserId ? 'запрошенный' : 'авторизованный'} ID: ${targetUserId}`);
    }

    // 2. Вызываем Supabase Edge Function "get-twitch-user"
    console.log(`[/api/twitch/user] Вызов Edge Function 'get-twitch-user' для пользователя ${targetUserId}...`);
    
    const { data: functionData, error: functionError } = await supabaseClient.functions.invoke(
        'get-twitch-user', 
        { 
            body: { userId: targetUserId }
        }
    );

    if (functionError) {
        console.error(`[/api/twitch/user] Ошибка при вызове Edge Function 'get-twitch-user':`, functionError);
        const status = functionError instanceof Error && functionError.message.includes('status') ? parseInt(functionError.message.split('status ')[1] || '500', 10) : 500;
        return NextResponse.json({ error: `Ошибка при вызове функции: ${functionError.message}` }, { status });
    }

    console.log("[/api/twitch/user] Edge Function 'get-twitch-user' успешно выполнена.");

    // 3. Возвращаем результат от Edge Function
    return NextResponse.json(functionData);

  } catch (error) {
    console.error('[/api/twitch/user] Критическая ошибка в обработчике:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

// Добавляем динамическую обработку, чтобы Vercel не кэшировал маршрут
export const dynamic = 'force-dynamic'; 