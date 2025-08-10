'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../utils/supabase/client';

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let unsub;
    const run = async () => {
      try {
        // 1) Быстрый путь: сессия уже есть
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          window.location.replace('/menu?freshLogin=true');
          return;
        }

        // 2) Ждём событие аутентификации (INITIAL_SESSION или SIGNED_IN)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
          if (s) {
            window.location.replace('/menu?freshLogin=true');
          }
        });
        unsub = subscription?.unsubscribe;

        // 3) Подстраховка: если в URL есть ошибка — отправим на главную
        const url = new URL(window.location.href);
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
    };
  }, [router]);

  return (
    <div style={{display:'grid',placeItems:'center',height:'100vh',color:'#ccc'}}>Авторизуем…</div>
  );
}


