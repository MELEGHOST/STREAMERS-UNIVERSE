import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // Если есть ошибка в параметрах, сразу редиректим с ней
  const errorParam = searchParams.get('error');
  const errorDescriptionParam = searchParams.get('error_description');
  if (errorParam) {
      return NextResponse.redirect(`${origin}/?error=${errorParam}&error_description=${errorDescriptionParam || 'An unknown error occurred.'}`);
  }

  if (!code) {
    console.error('[Auth Callback] "code" is missing.');
    return NextResponse.redirect(`${origin}/?error=auth_error&error_description=code_not_found`);
  }
  
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => cookieStore.set({ name, value, ...options }),
        remove: (name, options) => cookieStore.set({ name, value: '', ...options }),
      },
      cookieOptions: {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365  // 1 год
      }
    }
  );

  console.log('[Auth Callback] Received code:', code);
  console.log('[Auth Callback] Origin:', origin);
  const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[Auth Callback] Error exchanging code for session:', error.message);
    return NextResponse.redirect(`${origin}/?error=auth_error&error_description=${encodeURIComponent(error.message)}`);
  } else {
    console.log('[Auth Callback] Successfully exchanged code for session.');
  }
  
  // Успешный редирект в меню
  return NextResponse.redirect(`${origin}/menu?freshLogin=true`);
}

export const dynamic = 'force-dynamic'; 