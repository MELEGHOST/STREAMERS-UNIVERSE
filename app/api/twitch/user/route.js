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

  // --- Проверка JWT токена (опционально, для получения profileData) ---
  let supabaseUserId = null;
  let profileData = null; 
  
  if (token) {
      const verifiedToken = await verifyJwt(token);
      if (verifiedToken) {
          supabaseUserId = verifiedToken.sub; // ID пользователя из токена
          console.log(`[API /api/twitch/user] Authenticated request for Twitch ID ${userId} by Supabase User ${supabaseUserId}`);
          
          // --- Пытаемся получить profileData из user_profiles, если токен валидный ---
          try {
              const { data: profile, error: profileError } = await supabaseAdmin
                  .from('user_profiles')
                  .select('*') // Запрашиваем все поля
                  .eq('user_id', supabaseUserId)
                  .single();
                  
              if (profileError && profileError.code !== 'PGRST116') { // Игнорируем ошибку "not found"
                  console.error(`[API /api/twitch/user] Error fetching profile for ${supabaseUserId}:`, profileError);
              } else if (profile) {
                  profileData = profile; // Сохраняем найденный профиль
                  console.log(`[API /api/twitch/user] User profile found in Supabase for ${supabaseUserId}`);
              } else {
                  console.log(`[API /api/twitch/user] User profile NOT found in Supabase for ${supabaseUserId}`);
              }
          } catch (e) {
               console.error("[API /api/twitch/user] Unexpected error during Supabase profile fetch:", e);
          }
          
      } else {
          console.warn(`[API /api/twitch/user] Invalid or expired token provided for userId ${userId}. Proceeding without profile data.`);
      }
  } else {
       console.log(`[API /api/twitch/user] No token provided for userId ${userId}. Fetching public data only.`);
  }

  // --- Получаем данные с Twitch (независимо от токена) ---
  try {
    const twitchClient = await getTwitchClient();
    if (!twitchClient) {
      console.error("[API /api/twitch/user] Failed to initialize Twitch client.");
      return NextResponse.json({ error: 'Failed to initialize Twitch client' }, { status: 500 });
    }

    console.log(`[API /api/twitch/user] Fetching public data for user ${userId} from Twitch API...`);
    
    const userResponse = await twitchClient.users.getUserById(userId);
    if (!userResponse) {
      console.warn(`[API /api/twitch/user] Twitch user with ID ${userId} not found.`);
      return NextResponse.json({ error: 'Twitch user not found' }, { status: 404 });
    }
    console.log(`[API /api/twitch/user] Twitch user data fetched successfully.`);

    // --- Получаем последние видео (VODs) --- 
    // (Остается без изменений, это публичные данные)
    let videos = [];
    try {
        const videosResponse = await twitchClient.videos.getVideosByUser(userId, { limit: 5, type: 'archive' });
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
        console.error(`[API /api/twitch/user] Error fetching videos for user ${userId}:`, videoError);
    }

    // --- Собираем все данные для ответа --- 
    const twitchUserData = {
      id: userResponse.id,
      login: userResponse.name,
      display_name: userResponse.displayName,
      type: userResponse.type, 
      broadcaster_type: userResponse.broadcasterType,
      description: userResponse.description,
      profile_image_url: userResponse.profilePictureUrl,
      offline_image_url: userResponse.offlinePlaceholderUrl,
      view_count: userResponse.views,
      created_at: userResponse.creationDate,
      // ВОЗВРАЩАЕМ ПОЛЕ, НО С null, ТАК КАК НЕ МОЖЕМ ПОЛУЧИТЬ ДАННЫЕ
      followers_count: null, 
      videos: videos,
    };
    
    // --- Возвращаем и Twitch данные, и profileData (если есть) ---
    const responsePayload = {
        twitch_user: twitchUserData,
        profile: profileData // Будет null, если токен невалидный или профиль не найден
    };

    console.log(`[API /api/twitch/user] Successfully processed request for Twitch User ID: ${userId}`);
    return NextResponse.json(responsePayload, { status: 200 });

  } catch (error) {
    console.error(`[API /api/twitch/user] General Error processing request for ${userId}:`, error);
    if (error.statusCode) {
        return NextResponse.json({ error: `Twitch API Error: ${error.message}` }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic'; 