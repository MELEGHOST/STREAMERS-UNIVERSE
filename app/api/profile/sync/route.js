import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Этот эндпоинт будет вызываться на клиенте после логина,
// чтобы убедиться, что для пользователя auth.users существует запись в public.profiles
export async function POST() {
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
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Пользователь не авторизован.' }, { status: 401 });
  }

  // 1. Проверяем, существует ли профиль
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') { // PGRST116 - 'No rows found'
    console.error('[Sync Profile API] Ошибка при поиске профиля:', profileError);
    return NextResponse.json({ error: 'Ошибка базы данных при поиске профиля.' }, { status: 500 });
  }

  // 2. Если профиль уже есть, возвращаем его
  if (profile) {
    return NextResponse.json(profile);
  }

  // 3. Если профиля нет, создаем его
  const newUserProfile = {
    id: user.id,
    // Извлекаем данные из user_metadata, которые предоставляет Twitch
    twitch_user_id: user.user_metadata.provider_id,
    twitch_user_name: user.user_metadata.user_name,
    twitch_display_name: user.user_metadata.name,
    twitch_profile_image_url: user.user_metadata.avatar_url,
    email: user.email,
    // 'user' - роль по умолчанию
    role: 'user', 
  };
  
  const { data: createdProfile, error: createError } = await supabase
    .from('profiles')
    .insert(newUserProfile)
    .select()
    .single();

  if (createError) {
    console.error('[Sync Profile API] Ошибка при создании профиля:', createError);
    return NextResponse.json({ error: 'Не удалось создать профиль пользователя.' }, { status: 500 });
  }

  console.log(`[Sync Profile API] Профиль для пользователя ${user.id} успешно создан.`);
  return NextResponse.json(createdProfile);
} 