import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Если `next` параметр был передан при вызове signInWithOAuth,
  // он будет здесь, иначе перенаправим на /menu по умолчанию.
  const next = searchParams.get('next') ?? '/menu'

  console.log('[Auth Callback] Начало обработки. Код получен:', !!code)
  console.log('[Auth Callback] Параметр next:', next)
  console.log('[Auth Callback] Origin:', origin)

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
              cookieStore.set({ name, value, ...options })
              // Логируем установку сессионных кук
              if (name.includes('sb-') && name.includes('-auth-token')) {
                console.log(`[Auth Callback] Установлена кука сессии: ${name}`)
              }
            } catch (error) {
              console.error(`[Auth Callback] Ошибка установки куки ${name}:`, error)
            }
          },
          remove(name, options) {
            try {
              cookieStore.set({ name, value: '', ...options, maxAge: 0 })
            } catch (error) {
              console.error(`[Auth Callback] Ошибка удаления куки ${name}:`, error)
            }
          },
        },
      }
    )

    console.log('[Auth Callback] Обмен кода на сессию...')
    const { error, data: { session } } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[Auth Callback] Ошибка обмена кода на сессию:', error.message)
      // Перенаправляем обратно на страницу входа с сообщением об ошибке
      return NextResponse.redirect(`${origin}/auth?error=Не удалось войти. Попробуйте снова.&error_description=${encodeURIComponent(error.message)}`)
    }

    if (session) {
      console.log('[Auth Callback] Сессия успешно получена! User ID:', session.user.id)
      console.log('[Auth Callback] Перенаправление на:', next)
      // Устанавливаем куку для индикации успешной авторизации
      cookieStore.set('auth_successful', 'true', { path: '/', maxAge: 5 }) // Живет 5 секунд
      // Перенаправляем пользователя на указанный `next` URL или /menu
      return NextResponse.redirect(`${origin}${next}`)
    } else {
      console.error('[Auth Callback] Обмен кода прошел без ошибки, но сессия не получена.')
      return NextResponse.redirect(`${origin}/auth?error=Неожиданная ошибка входа.`)
    }
  } else {
    console.error('[Auth Callback] Параметр "code" отсутствует в запросе.')
    // Если код отсутствует, перенаправляем на страницу входа с ошибкой
    return NextResponse.redirect(`${origin}/auth?error=Ошибка авторизации: код не найден.`)
  }
}

// Указываем, что маршрут динамический
export const dynamic = 'force-dynamic' 