import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('[/api/twitch/user] Начало обработки запроса (v2 - Edge Function)');
    const cookieStore = cookies();
    
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

    // 1. Получаем аутентифицированного пользователя
    console.log('[/api/twitch/user] Вызов supabaseAuthClient.auth.getUser()...');
    const { data: { user }, error: userError } = await supabaseAuthClient.auth.getUser();
    
    if (userError) {
      console.error('[/api/twitch/user] Ошибка при getUser():', userError);
      return NextResponse.json({ error: 'Ошибка аутентификации (getUser)' }, { status: 401 });
    }

    if (!user) {
      console.log('[/api/twitch/user] Пользователь не найден после getUser()');
      return NextResponse.json({ error: 'Пользователь не аутентифицирован (getUser)' }, { status: 401 });
    }

    console.log('[/api/twitch/user] getUser() успешен, ID пользователя:', user.id);

    // 2. Вызываем Supabase Edge Function "get-twitch-user"
    console.log(`[/api/twitch/user] Вызов Edge Function 'get-twitch-user' для пользователя ${user.id}...`);
    
    // Создаем сервисный клиент для вызова функции (или можно использовать обычный, если RLS позволяет)
    // Использование сервисного ключа здесь может быть избыточным, если функция не требует особой авторизации
    // Но если функция использует SUPABASE_SERVICE_ROLE_KEY внутри, то вызывать ее лучше с ним же для консистентности
    // Используем обычный клиент, так как функция сама использует Admin Client внутри
    const supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        // Можно добавить глобальный fetch для обработки ошибок сети
    );

    const { data: functionData, error: functionError } = await supabaseClient.functions.invoke(
        'get-twitch-user', 
        { 
            body: { userId: user.id },
            // Устанавливаем заголовок Authorization вручную, используя токен из сессии текущего пользователя
            // Это может быть необходимо, если Edge Function проверяет JWT через `--verify-jwt`
            // Но так как мы используем --no-verify-jwt, это может быть не нужно. Оставляем для примера.
            // headers: {
            //     Authorization: `Bearer ${session?.access_token}` 
            // }
        }
    );

    if (functionError) {
        console.error(`[/api/twitch/user] Ошибка при вызове Edge Function 'get-twitch-user':`, functionError);
        const status = functionError instanceof Error && functionError.message.includes('status') ? parseInt(functionError.message.split('status ')[1] || '500', 10) : 500;
        return NextResponse.json({ error: `Ошибка при вызове функции: ${functionError.message}` }, { status });
    }

    console.log('[/api/twitch/user] Edge Function 'get-twitch-user' успешно выполнена.');

    // 3. Возвращаем результат от Edge Function
    return NextResponse.json(functionData);

  } catch (error) {
    console.error('[/api/twitch/user] Критическая ошибка в обработчике:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

// Добавляем динамическую обработку, чтобы Vercel не кэшировал маршрут
export const dynamic = 'force-dynamic'; 