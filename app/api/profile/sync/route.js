import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Админ-клиент для обновления метаданных пользователя
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Этот эндпоинт будет вызываться на клиенте после логина,
// чтобы убедиться, что для пользователя auth.users существует запись в public.profiles
export async function POST({ headers }) {
  const authHeader = headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Отсутствует или некорректный заголовок Authorization.' }, { status: 401 });
  }
  const jwt = authHeader.substring(7);

  // Используем админский клиент для валидации JWT и получения пользователя
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);

  if (userError || !user) {
    console.error('[Sync Profile API] Ошибка получения пользователя по JWT:', userError?.message);
    return NextResponse.json({ error: 'Недействительный токен или пользователь не найден.' }, { status: 401 });
  }

  // --- ШАГ 1: Обновляем метаданные пользователя, чтобы сохранить provider_token ---
  // Поскольку мы не можем напрямую получить provider_token из getUser,
  // нам нужно декодировать JWT, чтобы найти его. Это безопасно, так как токен уже верифицирован.
  try {
    const decodedJwt = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString());
    const providerToken = decodedJwt.provider_token;

    if (providerToken) {
      const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { user_metadata: { ...user.user_metadata, provider_token: providerToken } }
      );
      if (updateUserError) {
          console.error(`[Sync Profile API] Ошибка обновления user_metadata для ${user.id}:`, updateUserError.message);
          // Не фатальная ошибка, продолжаем выполнение
      } else {
          console.log(`[Sync Profile API] Успешно сохранен provider_token для ${user.id}`);
      }
    } else {
      console.warn(`[Sync Profile API] provider_token не найден в JWT для пользователя ${user.id}. Пропускаем обновление.`);
    }
  } catch(e) {
    console.error(`[Sync Profile API] Не удалось декодировать JWT для извлечения provider_token:`, e.message);
  }


  // --- ШАГ 2: Проверяем и создаем профиль в public.profiles ---
  // Используем обычный клиент, но с аутентификацией от имени сервиса, 
  // так как мы уже верифицировали пользователя.
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('user_profiles')
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
  
  const { data: createdProfile, error: createError } = await supabaseAdmin
    .from('user_profiles')
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