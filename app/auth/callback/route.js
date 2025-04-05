import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/menu'; // Куда редиректить после успеха

  console.log('[Auth Callback] Обработка...', { code: !!code, next, origin });

  if (code) {
    const cookieStore = cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error("[Auth Callback] КРИТИЧЕСКАЯ ОШИБКА: Отсутствуют URL/ключ Supabase.");
        // Редирект на /auth с общей ошибкой конфигурации
        return NextResponse.redirect(`${origin}/auth?error=Server+Configuration+Error`);
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            try {
              cookieStore.set({ name, value, ...options });
              if (name.includes('sb-') && name.includes('-auth-token')) {
                 console.log(`[Auth Callback] Установлена кука сессии: ${name}`);
              }
            } catch (error) {
              console.error(`[Auth Callback] Ошибка установки куки ${name}:`, error);
            }
          },
          remove(name, options) {
            try {
              cookieStore.set({ name, value: '', ...options, maxAge: 0 });
            } catch (error) {
              console.error(`[Auth Callback] Ошибка удаления куки ${name}:`, error);
            }
          },
        },
      }
    );

    console.log('[Auth Callback] Обмен кода на сессию...');
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[Auth Callback] Ошибка обмена кода на сессию:', error.message);
      return NextResponse.redirect(`${origin}/auth?error=Не+удалось+войти.&error_description=${encodeURIComponent(error.message)}`);
    }

    // Успешно!
    console.log('[Auth Callback] Сессия успешно получена! Перенаправление на:', next);
    // Редирект на целевую страницу (или /menu)
    return NextResponse.redirect(`${origin}${next}`);

  } else {
     console.error('[Auth Callback] Параметр "code" отсутствует в запросе.');
     return NextResponse.redirect(`${origin}/auth?error=Ошибка+авторизации:+код+не+найден.`);
  }
}

export const dynamic = 'force-dynamic'; 