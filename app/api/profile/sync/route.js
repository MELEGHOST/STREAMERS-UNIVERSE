import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Админ-клиент для обновления метаданных пользователя
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Этот эндпоинт будет вызываться на клиенте после логина,
// чтобы убедиться, что для пользователя auth.users существует запись в public.profiles
export async function POST(request) {
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

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
      return NextResponse.json({ error: 'Пользователь не авторизован.' }, { status: 401 });
  }

  const user = session.user;
  const providerToken = session.provider_token;

  // --- ШАГ 1: Обновляем метаданные пользователя, чтобы сохранить provider_token ---
  if (providerToken) {
    const { data: updatedUser, error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { user_metadata: { ...user.user_metadata, provider_token: providerToken } }
    );
    if (updateUserError) {
        console.error(`[Sync Profile API] Ошибка обновления user_metadata для ${user.id}:`, updateUserError.message);
        // Не фатальная ошибка, продолжаем выполнение
    } else {
        console.log(`[Sync Profile API] Успешно сохранен provider_token для ${user.id}`);
    }
  }

  // --- ШАГ 2: Проверяем и создаем профиль в public.profiles ---
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    console.error('[Sync Profile API] Ошибка при поиске профиля:', profileError);
    return NextResponse.json({ error: 'Ошибка базы данных при поиске профиля.' }, { status: 500 });
  }

  if (profile) {
    return NextResponse.json(profile);
  }

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