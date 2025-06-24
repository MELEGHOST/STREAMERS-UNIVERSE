import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

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
      // Улучшенное логирование ошибки
      console.error('[Auth Callback] Ошибка обмена кода на сессию:', {
          message: error.message,
          status: error.status,
          code: error.code, // Если есть код ошибки Supabase
          details: error.cause, // Иногда тут детали
          name: error.name,
          fullError: error // Логируем весь объект ошибки
      });
      // Передаем более понятное сообщение пользователю, если возможно
      let userErrorMessage = 'Не удалось войти.';
      if (error.message.includes('invalid_grant')) {
          userErrorMessage = 'Ошибка авторизации: Неверный или истекший код авторизации. Попробуйте снова.';
      } else if (error.status === 403) {
           userErrorMessage = 'Доступ запрещен. Проверьте настройки OAuth провайдера.';
      }
      // Редирект с улучшенным сообщением
      return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(userErrorMessage)}&error_details=${encodeURIComponent(error.message)}`);
    }

    // Успешно! Перенаправляем на главную страницу.
    console.log('[Auth Callback] Сессия успешно получена! Перенаправление на:', next);
    return NextResponse.redirect(`${origin}${next}`);

  } else {
     console.error('[Auth Callback] Параметр "code" отсутствует в запросе.');
     return NextResponse.redirect(`${origin}/auth?error=Ошибка+авторизации:+код+не+найден.`);
  }
}

export const dynamic = 'force-dynamic'; 