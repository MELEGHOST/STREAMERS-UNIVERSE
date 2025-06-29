import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/menu';

  console.log('[Auth Callback] Обработка, финальный редирект на:', next);

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
            cookieStore.set({ name, value, ...options });
          },
          remove(name, options) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    console.log('[Auth Callback] Обмен кода на сессию...');
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[Auth Callback] Ошибка обмена кода на сессию:', error);
      return NextResponse.redirect(`${origin}/?error=auth_error&error_description=${encodeURIComponent(error.message)}`);
    }
    
    // После успешного входа, если был реферер, нужно его привязать
    const referrerId = searchParams.get('referrer_id');
    if (referrerId && data.user) {
        try {
            console.log(`[Auth Callback] Попытка привязать реферера ${referrerId} к пользователю ${data.user.id}`);
            // Вызываем API для сохранения реферера
            const response = await fetch(`${origin}/api/profile/set-referrer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${data.session.access_token}`
                },
                body: JSON.stringify({ referrerId: referrerId })
            });
            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`[Auth Callback] Ошибка API при привязке реферера: ${response.status}`, errorBody);
            } else {
                console.log(`[Auth Callback] Реферер ${referrerId} успешно привязан.`);
            }
        } catch (apiError) {
            console.error('[Auth Callback] Исключение при вызове API для привязки реферера:', apiError);
        }
    }

    return NextResponse.redirect(`${origin}${next}`);
  } else {
     console.error('[Auth Callback] Параметр "code" отсутствует в запросе.');
     return NextResponse.redirect(`${origin}/?error=auth_error&error_description=code_not_found`);
  }
}

export const dynamic = 'force-dynamic'; 