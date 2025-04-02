import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Параметр 'next' может использоваться для перенаправления пользователя
  // на страницу, с которой он начал вход, если это было реализовано.
  // По умолчанию перенаправляем на /menu.
  const next = searchParams.get('next') ?? '/menu'

  console.log(`Auth Callback: Получен code: ${!!code}, origin: ${origin}, next: ${next}`);

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          // Используем getAll
          getAll: () => {
            const allCookies = cookieStore.getAll();
            return allCookies.map(({ name, value }) => ({ name, value }));
          },
          // Используем setAll
          setAll: (cookiesToSet) => {
            try {
              console.log(`Auth Callback: Установка ${cookiesToSet.length} cookies...`);
              cookiesToSet.forEach(({ name, value, options }) => {
                console.log(`  - Установка ${name} (path: ${options.path || '/'})`);
                cookieStore.set(name, value, options);
              });
            } catch (error) {
              console.error(`Auth Callback: Ошибка установки cookies:`, error);
            }
          },
          // Используем remove
          remove: (name, options) => {
            try {
              console.log(`Auth Callback: Удаление cookie ${name} (path: ${options.path || '/'})`);
              cookieStore.set({ name, value: '', ...options, maxAge: 0 });
            } catch (error) {
               console.error(`Auth Callback: Ошибка удаления cookie ${name}:`, error);
            }
          },
        },
      }
    )
    
    console.log('Auth Callback: Вызов supabase.auth.exchangeCodeForSession...');
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
        console.error('Auth Callback: Ошибка при обмене кода на сессию:', error);
        // Перенаправляем на страницу входа с сообщением об ошибке
        return NextResponse.redirect(`${origin}/auth?error=auth_code_exchange_failed&message=${encodeURIComponent(error.message)}`);
    }

    // --- СТРОГАЯ ПРОВЕРКА СЕССИИ И ТОКЕНА СРАЗУ ПОСЛЕ ОБМЕНА --- 
    if (data && data.session && data.session.provider_token) {
        console.log('Auth Callback: Сессия УСПЕШНО получена и provider_token присутствует СРАЗУ ПОСЛЕ обмена кода.', {
            userId: data.user?.id,
            providerTokenStart: data.session.provider_token?.substring(0, 5),
            refreshTokenStart: data.session.provider_refresh_token?.substring(0, 5)
        });
        // Если все хорошо, продолжаем редирект
        console.log('Auth Callback: Обмен кода на сессию прошел успешно. Перенаправление на:', `${origin}${next}`);
        return NextResponse.redirect(`${origin}${next}`)
    } else {
        console.error('Auth Callback: КРИТИЧЕСКАЯ ОШИБКА - provider_token ОТСУТСТВУЕТ в сессии СРАЗУ ПОСЛЕ exchangeCodeForSession!', { data });
        // Если токена нет уже здесь, это проблема конфигурации Supabase или ответа Twitch
        // Перенаправляем на страницу входа с сообщением об ошибке
        return NextResponse.redirect(`${origin}/auth?error=provider_token_missing_post_exchange`);
    }
    // --- КОНЕЦ ПРОВЕРКИ ---

  } else {
      console.warn('Auth Callback: Код авторизации отсутствует в запросе.');
      // Если код отсутствует, перенаправляем на страницу входа с сообщением об ошибке
      return NextResponse.redirect(`${origin}/auth?error=auth_code_missing`);
  }
}

// Добавляем динамическую обработку, чтобы Vercel не кэшировал маршрут
export const dynamic = 'force-dynamic'; 