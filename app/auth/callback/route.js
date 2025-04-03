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

    // --- ИЗМЕНЕНО: Пытаемся сохранить токены вручную --- 
    if (data && data.session && data.user) {
      const { session, user } = data;
      const providerToken = session.provider_token;
      const providerRefreshToken = session.provider_refresh_token;

      if (providerToken) {
          console.log('Auth Callback: Сессия УСПЕШНО получена и provider_token присутствует СРАЗУ ПОСЛЕ обмена кода.', {
              userId: user.id,
              providerTokenStart: providerToken?.substring(0, 5),
              refreshTokenStart: providerRefreshToken?.substring(0, 5)
          });
          
          // Сохраняем токены в user_metadata
          console.log(`Auth Callback: Попытка сохранить токены в метаданных пользователя ${user.id}...`);
          const { error: updateError } = await supabase.auth.updateUser({
              data: {
                  // Добавляем поля или обновляем существующие
                  provider_token: providerToken,
                  provider_refresh_token: providerRefreshToken,
              }
          });

          if (updateError) {
              console.error('Auth Callback: Ошибка при обновлении метаданных пользователя с токенами:', updateError);
              // Не критично для редиректа, но нужно залогировать
              // Можно перенаправить с параметром ошибки, если это важно
              // return NextResponse.redirect(`${origin}/auth?error=user_metadata_update_failed`);
          } else {
              console.log('Auth Callback: Токены успешно сохранены в метаданных пользователя.');
          }
          
          // Если все хорошо, продолжаем редирект
          console.log('Auth Callback: Обмен кода и обновление метаданных прошли успешно. Перенаправление на:', `${origin}${next}`);
          return NextResponse.redirect(`${origin}${next}`)

      } else {
          // provider_token все еще отсутствует!
          console.error('Auth Callback: КРИТИЧЕСКАЯ ОШИБКА - provider_token ОТСУТСТВУЕТ в сессии СРАЗУ ПОСЛЕ exchangeCodeForSession! Невозможно сохранить токены вручную.', { session });
          // Если токена нет уже здесь, это проблема конфигурации Supabase или ответа Twitch
          // Перенаправляем на страницу входа с сообщением об ошибке
          return NextResponse.redirect(`${origin}/auth?error=provider_token_missing_post_exchange`);
      }
    } else {
        console.error('Auth Callback: Ошибка - отсутствуют данные сессии или пользователя после обмена кода.', { data });
        return NextResponse.redirect(`${origin}/auth?error=session_data_missing_post_exchange`);
    }
    // --- КОНЕЦ ИЗМЕНЕНИЙ ---

  } else {
      console.warn('Auth Callback: Код авторизации отсутствует в запросе.');
      // Если код отсутствует, перенаправляем на страницу входа с сообщением об ошибке
      return NextResponse.redirect(`${origin}/auth?error=auth_code_missing`);
  }
}

// Добавляем динамическую обработку, чтобы Vercel не кэшировал маршрут
export const dynamic = 'force-dynamic'; 