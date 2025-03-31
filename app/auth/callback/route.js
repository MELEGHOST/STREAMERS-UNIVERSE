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
          get(name) {
            return cookieStore.get(name)?.value
          },
          set(name, value, options) {
            try {
              console.log(`Auth Callback: Установка cookie ${name}, secure: ${options.secure}, httpOnly: ${options.httpOnly}, sameSite: ${options.sameSite}`);
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // Обработка ошибок, если cookie не может быть установлен
              console.error(`Auth Callback: Ошибка установки cookie ${name}:`, error);
            }
          },
          remove(name, options) {
            console.log(`Auth Callback: Удаление cookie ${name}`);
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
               console.error(`Auth Callback: Ошибка удаления cookie ${name}:`, error);
            }
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      console.log('Auth Callback: Обмен кода на сессию прошел успешно. Перенаправление на:', `${origin}${next}`);
      return NextResponse.redirect(`${origin}${next}`)
    } else {
      console.error('Auth Callback: Ошибка при обмене кода на сессию:', error);
      // Перенаправляем на страницу входа с сообщением об ошибке
      return NextResponse.redirect(`${origin}/auth?error=auth_code_exchange_failed`);
    }
  } else {
      console.warn('Auth Callback: Код авторизации отсутствует в запросе.');
      // Если код отсутствует, перенаправляем на страницу входа с сообщением об ошибке
      return NextResponse.redirect(`${origin}/auth?error=auth_code_missing`);
  }
}

// Добавляем динамическую обработку, чтобы Vercel не кэшировал маршрут
export const dynamic = 'force-dynamic'; 