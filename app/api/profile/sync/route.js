import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTwitchClientWithToken } from '../../../utils/twitchClient';
import { handleAchievementTrigger } from '../../../utils/achievements';

export async function POST({ headers }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[Sync Profile API] Supabase configuration missing");
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const authHeader = headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Отсутствует или некорректный заголовок Authorization.' }, { status: 401 });
  }
  const jwt = authHeader.substring(7);

  if (!jwt) {
    console.error('[Sync Profile API] JWT is missing in Authorization header.');
    return NextResponse.json({ error: 'Missing JWT token.' }, { status: 401 });
  }

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

  // Получаем broadcaster_type из Twitch API
  const twitchClient = await getTwitchClientWithToken(jwt);
  const twitchUser = twitchClient && user.user_metadata.provider_id 
    ? await twitchClient.users.getUserById(user.user_metadata.provider_id) 
    : null;
  const broadcasterType = twitchUser?.broadcasterType || '';

  if (profile) {
    // Если профиль существует, обновляем broadcaster_type, если он изменился
    if (profile.broadcaster_type !== broadcasterType) {
      await supabaseAdmin.from('user_profiles').update({ broadcaster_type: broadcasterType }).eq('id', user.id);
      console.log(`[Sync Profile API] Updated broadcaster_type for user ${user.id} to '${broadcasterType}'`);
    }
    // Триггеры ачивок, если нужно
    await handleAchievementTrigger(user.id, 'twitch_status');
    await handleAchievementTrigger(user.id, 'twitch_partner');
    
    // Возвращаем обновленный профиль
    const updatedProfile = { ...profile, broadcaster_type: broadcasterType };
    return NextResponse.json(updatedProfile);
  }

  // Если профиль не существует, создаем новый
  const newUserProfile = {
    id: user.id,
    twitch_user_id: user.user_metadata.provider_id,
    twitch_user_name: user.user_metadata.user_name,
    twitch_display_name: user.user_metadata.name,
    twitch_profile_image_url: user.user_metadata.avatar_url,
    email: user.email,
    role: 'user', 
    broadcaster_type: broadcasterType, // Сразу добавляем тип
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

  // Триггеры ачивок для нового пользователя
  await handleAchievementTrigger(user.id, 'twitch_status');
  await handleAchievementTrigger(user.id, 'twitch_partner');
  
  return NextResponse.json(createdProfile);
} 