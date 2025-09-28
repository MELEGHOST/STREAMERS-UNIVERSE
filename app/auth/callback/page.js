'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../utils/supabase/client';

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let unsub;
    let fallbackTimer;
    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const hasCode = url.searchParams.get('code');
        const hasState = url.searchParams.get('state');

        // Если пришли по коду OAuth — явно обменяем на сессию
        if (hasCode && hasState) {
          try {
            const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
            if (error) {
              console.error('[Callback] exchangeCodeForSession error', error);
            } else {
              // Успешный обмен — ставим флаг свежего логина
              try { sessionStorage.setItem('freshLogin', '1'); } catch {}
              // Чистим URL от чувствительных параметров
              window.history.replaceState({}, document.title, '/auth/callback');
            }
          } catch (err) {
            console.error('[Callback] exchangeCodeForSession exception', err);
          }
        }

        const waitForSession = async (retries = 20, delayMs = 100) => {
          for (let i = 0; i < retries; i++) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) return session;
            await new Promise(r => setTimeout(r, delayMs));
          }
          return null;
        };

        // 1) Быстрый путь: сессия уже есть
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          try { sessionStorage.setItem('freshLogin', '1'); } catch {}
          // Подстраховка: ждем, пока клиент точно сохранит сессию
          await waitForSession();
          window.location.replace('/menu?freshLogin=true');
          return;
        }

        // 2) Ждём событие аутентификации (INITIAL_SESSION или SIGNED_IN)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
          if (s) {
            try { sessionStorage.setItem('freshLogin', '1'); } catch {}
            await waitForSession();
            window.location.replace('/menu?freshLogin=true');
          }
        });
        unsub = subscription?.unsubscribe;

        // 3.1) Фолбэк: если за 5с не получили сессию — попробуем ещё раз и уйдем с ошибкой/успехом
        fallbackTimer = setTimeout(async () => {
          const { data: { session: lateSession } } = await supabase.auth.getSession();
          if (lateSession) {
            try { sessionStorage.setItem('freshLogin', '1'); } catch {}
            window.location.replace('/menu?freshLogin=true');
          } else {
            window.location.replace('/?error=auth_timeout');
          }
        }, 5000);

        // 3) Подстраховка: если в URL есть ошибка — отправим на главную
        if (url.searchParams.get('error') || url.searchParams.get('error_description')) {
          window.location.replace('/?error=auth_error');
        }
      } catch (e) {
        console.error('[Callback] unexpected error', e);
        window.location.replace('/?error=auth_error');
      }
    };
    run();

    return () => {
      try { unsub?.(); } catch {}
      try { clearTimeout(fallbackTimer); } catch {}
    };
  }, [router]);

  return (
    <div style={{display:'grid',placeItems:'center',height:'100vh',color:'#ccc'}}>Авторизуем…</div>
  );
}


