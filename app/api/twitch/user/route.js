import { NextResponse } from 'next/server';
import { getTwitchClient } from '../../../utils/twitchClient';
import { createClient } from '@supabase/supabase-js';
import { verifyJwt } from '../../../utils/jwt';

// Инициализация Supabase Admin Client (используем сервисный ключ)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[API /api/twitch/user] Critical Error: Supabase URL or Service Key is missing!");
    // В реальном приложении здесь стоит выбрасывать ошибку или обрабатывать иначе
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false } // Не сохраняем сессию для админ клиента
});

// // Переменные для кэширования App Access Token (НЕ ИСПОЛЬЗУЮТСЯ ЗДЕСЬ)
// let appAccessToken = null;
// let tokenExpiry = 0;

// // Функция для получения App Access Token от Twitch (НЕ ИСПОЛЬЗУЕТСЯ ЗДЕСЬ)
// async function getTwitchAppAccessToken() { 
// ...
// }

export async function GET(request) {
  const userId = request.nextUrl.searchParams.get('userId');
  const token = request.headers.get('Authorization')?.split(' ')[1]; // Получаем JWT

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
  }
  
  if (!/^[0-9]+$/.test(userId)) {
      console.warn(`[API /api/twitch/user] Invalid Twitch User ID format received: ${userId}`);
      return NextResponse.json({ error: 'Invalid Twitch User ID format' }, { status: 400 });
  }

  // Проверка JWT токена (обязательно для защиты API)
  const verifiedToken = await verifyJwt(token);
  if (!verifiedToken) {
      console.warn(`[API /api/twitch/user] Unauthorized access attempt for userId ${userId}`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabaseUserId = verifiedToken.sub; // ID пользователя из токена

  console.log(`[API /api/twitch/user] Processing request for Twitch User ID: ${userId}, initiated by Supabase User: ${supabaseUserId}`);

  try {
    const twitchClient = await getTwitchClient();
    if (!twitchClient) {
      console.error("[API /api/twitch/user] Failed to initialize Twitch client.");
      return NextResponse.json({ error: 'Failed to initialize Twitch client' }, { status: 500 });
    }

    console.log(`[API /api/twitch/user] Fetching data for user ${userId} from Twitch API...`);
    
    // --- Получаем данные пользователя (Users) ---
    const userResponse = await twitchClient.users.getUserById(userId);
    if (!userResponse) {
      console.warn(`[API /api/twitch/user] Twitch user with ID ${userId} not found.`);
      return NextResponse.json({ error: 'Twitch user not found' }, { status: 404 });
    }
    console.log(`[API /api/twitch/user] User data fetched successfully.`);

    // --- Получаем количество фолловеров (Follows) ---
    let followersCount = 0;
    try {
        const followsResponse = await twitchClient.channels.getChannelFollowers(userId, userId, undefined, 1); // Запрашиваем только 1 для получения total
        followersCount = followsResponse?.total ?? 0;
        console.log(`[API /api/twitch/user] Followers count fetched: ${followersCount}`);
    } catch (followError) {
        // Ошибки получения фолловеров не должны блокировать основной ответ
        console.error(`[API /api/twitch/user] Error fetching followers for user ${userId}:`, followError);
        // Не возвращаем ошибку, просто будет 0 фолловеров
    }

    // --- Получаем последние видео (VODs) ---
    let videos = [];
    try {
        const videosResponse = await twitchClient.videos.getVideosByUser(userId, { limit: 5, type: 'archive' }); // Запрашиваем последние 5 архивов
        videos = videosResponse.data.map(v => ({
            id: v.id,
            title: v.title,
            url: v.url,
            thumbnail_url: v.thumbnailUrl,
            view_count: v.viewCount,
            duration: v.duration,
            created_at: v.creationDate,
        }));
        console.log(`[API /api/twitch/user] Fetched ${videos.length} VODs.`);
    } catch (videoError) {
        // Ошибки получения видео не должны блокировать основной ответ
        console.error(`[API /api/twitch/user] Error fetching videos for user ${userId}:`, videoError);
        // Не возвращаем ошибку, просто будет пустой массив видео
    }

    // --- Собираем все данные для ответа --- 
    const responseData = {
      id: userResponse.id,
      login: userResponse.name,
      display_name: userResponse.displayName,
      type: userResponse.type, // '', 'staff', 'admin', 'global_mod'
      broadcaster_type: userResponse.broadcasterType, // '', 'affiliate', 'partner'
      description: userResponse.description,
      profile_image_url: userResponse.profilePictureUrl,
      offline_image_url: userResponse.offlinePlaceholderUrl,
      view_count: userResponse.views, // Это просмотры канала, а не конкретного стрима
      created_at: userResponse.creationDate,
      // Новые данные:
      followers_count: followersCount,
      videos: videos,
    };

    // --- Обновляем user_profiles в Supabase (кэш фолловеров и возможная смена роли) ---
    // Делаем это асинхронно, не дожидаясь ответа, чтобы не замедлять API
    (async () => {
        try {
             console.log(`[API /api/twitch/user] Updating profile cache in Supabase for user ${supabaseUserId}...`);
             // Определяем новую роль
             const newRole = followersCount >= 275 ? 'streamer' : 'viewer'; 
             
             const { data: updateData, error: updateError } = await supabaseAdmin
                .from('user_profiles')
                .update({ 
                    twitch_follower_count: followersCount,
                    role: newRole, // Обновляем роль
                    updated_at: new Date().toISOString()
                 })
                .eq('user_id', supabaseUserId)
                .select('role') // Выбираем роль, чтобы проверить, изменилась ли она
                .single(); // Ожидаем одну запись или null

            if (updateError) {
                // Если профиль еще не создан, пытаемся создать его (upsert не всегда работает без PK)
                if (updateError.code === 'PGRST116') { // code for "JSON object requested, multiple (or no) rows returned" 
                    console.warn(`[API /api/twitch/user] Profile for ${supabaseUserId} not found, creating...`);
                    const { error: insertError } = await supabaseAdmin
                        .from('user_profiles')
                        .insert({
                            user_id: supabaseUserId,
                            twitch_follower_count: followersCount,
                            role: newRole,
                            updated_at: new Date().toISOString()
                        });
                     if (insertError) {
                         console.error(`[API /api/twitch/user] Error creating profile for ${supabaseUserId}:`, insertError);
                     } else {
                         console.log(`[API /api/twitch/user] Profile created for ${supabaseUserId} with role ${newRole}.`);
                     }
                } else {
                    console.error(`[API /api/twitch/user] Error updating profile for ${supabaseUserId}:`, updateError);
                }
            } else if (updateData) {
                 console.log(`[API /api/twitch/user] Profile updated for ${supabaseUserId}. Current role: ${updateData.role}, New potential role: ${newRole}`);
                 if (updateData.role !== newRole) {
                     console.log(`[API /api/twitch/user] Role changed for ${supabaseUserId} to ${newRole}`);
                 }
            }
        } catch(e) {
            console.error("[API /api/twitch/user] Unexpected error during Supabase profile update:", e);
        }
    })(); // Самовызывающаяся асинхронная функция

    console.log(`[API /api/twitch/user] Successfully processed request for Twitch User ID: ${userId}`);
    return NextResponse.json(responseData, { status: 200 });

  } catch (error) {
    console.error(`[API /api/twitch/user] General Error processing request for ${userId}:`, error);
    // Проверяем тип ошибки от Twitch клиента (может быть ApiBadResponseError и т.д.)
    if (error.statusCode) {
        return NextResponse.json({ error: `Twitch API Error: ${error.message}` }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic'; 