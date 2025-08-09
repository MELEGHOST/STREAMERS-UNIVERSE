'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../utils/supabase/client';

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handle = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('[Callback] getSession error:', error.message);
          router.replace('/?error=auth_error');
          return;
        }
        if (session) {
          router.replace('/menu?freshLogin=true');
        } else {
          const params = new URLSearchParams(window.location.search);
          const code = params.get('code');
          if (code) {
            const { error: exchError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchError) {
              console.error('[Callback] exchangeCodeForSession error:', exchError.message);
              router.replace('/?error=auth_error');
              return;
            }
            router.replace('/menu?freshLogin=true');
          } else {
            router.replace('/?error=auth_error');
          }
        }
      } catch (e) {
        console.error('[Callback] unexpected error', e);
        router.replace('/?error=auth_error');
      }
    };
    handle();
  }, [router]);

  return (
    <div style={{display:'grid',placeItems:'center',height:'100vh',color:'#ccc'}}>Авторизуем…</div>
  );
}


