import { NextResponse } from 'next/server';
import { getTwitchClient, getTwitchClientWithToken } from '../../../utils/twitchClient';
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

// --- Функция определения роли --- 
// (Можно вынести в utils, если будет сложнее)
const determineRole = (followerCount, broadcasterType) => {
    if (broadcasterType === 'partner' || broadcasterType === 'affiliate') {
        // Условно считаем партнеров и компаньонов стримерами в нашей системе
        return 'streamer';
    } 
    // Можно добавить больше условий, например, по числу фолловеров
    // if (followerCount >= 10) { return 'active_viewer'; }
    return 'viewer'; // По умолчанию
};

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

  let supabaseUserId = null;
  let profileData = null; 
  let isOwnerViewing = false;

  // --- Получение публичных данных с Twitch --- 
  let twitchUserData = null;
  let videos = [];
  try {
      const appTwitchClient = await getTwitchClient(); // Используем App Token для публичных данных
      if (!appTwitchClient) throw new Error('Failed to initialize Twitch App client');

      console.log(`[API /api/twitch/user] Fetching public data for user ${userId} from Twitch API...`);
      const userResponse = await appTwitchClient.users.getUserById(userId);
      if (!userResponse) {
        console.warn(`[API /api/twitch/user] Twitch user with ID ${userId} not found.`);
        return NextResponse.json({ error: 'Twitch user not found' }, { status: 404 });
      }
      console.log(`[API /api/twitch/user] Twitch user data fetched successfully.`);

      // --- Получаем VODы (публичные) ---
      try {
          const videosResponse = await appTwitchClient.videos.getVideosByUser(userId, { limit: 5, type: 'archive' });
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
      
      // Собираем базовые данные Twitch
      twitchUserData = {
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
        followers_count: null, // Изначально null
        videos: videos,
      };

  } catch (error) {
      console.error(`[API /api/twitch/user] Error fetching public Twitch data for ${userId}:`, error);
      // Если не нашли пользователя или другая ошибка Twitch API
      if (error.statusCode) {
          return NextResponse.json({ error: `Twitch API Error: ${error.message}` }, { status: error.statusCode });
      }
      // Если ошибка инициализации клиента или другая внутренняя
      return NextResponse.json({ error: error.message || 'Internal Server Error fetching Twitch data' }, { status: 500 });
  }
  
  // --- Если есть токен, пытаемся получить профиль из базы и обновить данные для владельца ---
  if (token) {
      const verifiedToken = await verifyJwt(token);
      if (verifiedToken) {
          supabaseUserId = verifiedToken.sub; 
          console.log(`[API /api/twitch/user] Authenticated request by Supabase User ${supabaseUserId}`);
          
          // 1. Получаем профиль из user_profiles
          try {
              const { data: profile, error: profileError } = await supabaseAdmin
                  .from('user_profiles')
                  .select('*') 
                  .eq('user_id', supabaseUserId)
                  .single();
                  
              if (profileError && profileError.code !== 'PGRST116') {
                  console.error(`[API /api/twitch/user] Error fetching profile for ${supabaseUserId}:`, profileError);
              } else if (profile) {
                  profileData = profile; 
                  console.log(`[API /api/twitch/user] User profile found in Supabase for ${supabaseUserId}`);
                  // Проверяем, принадлежит ли найденный профиль авторизованному пользователю
                  if (profileData.user_id === supabaseUserId) {
                      isOwnerViewing = true; // Устанавливаем флаг, что владелец смотрит (даже если twitch_id еще не совпал)
                      console.log(`[API /api/twitch/user] Logged-in user ${supabaseUserId} matches owner of the fetched profile. Will attempt to refresh data.`);
                  } else {
                       console.log(`[API /api/twitch/user] Logged-in user ${supabaseUserId} does not match owner (${profileData.user_id}) of the fetched profile.`);
                  }
              } else {
                  console.log(`[API /api/twitch/user] User profile NOT found in Supabase for ${supabaseUserId}`);
                  // Если профиля нет, НО пользователь авторизован, он может смотреть свой профиль первый раз
                  // Мы всё равно попытаемся сделать upsert ниже, если isOwnerViewing будет установлен по twitch id в токене
                  // Добавим проверку Twitch ID из токена, если он там есть
                  const twitchIdFromToken = verifiedToken.user_metadata?.provider_id; 
                  if (twitchIdFromToken && twitchIdFromToken === userId) {
                       console.log(`[API /api/twitch/user] Logged-in user ${supabaseUserId} matches the requested Twitch ID ${userId} from token. Will attempt to upsert profile.`);
                       isOwnerViewing = true; // Ставим флаг для попытки upsert
                  }
              }
          } catch (e) {
               console.error("[API /api/twitch/user] Unexpected error during Supabase profile fetch:", e);
          }
          
          // 2. Если АВТОРИЗОВАННЫЙ ПОЛЬЗОВАТЕЛЬ смотрит свой профиль (проверка по supabaseUserId или twitchId из токена), пытаемся обновить данные
          if (isOwnerViewing) { // Теперь isOwnerViewing ставится, если user_id совпал или если профиля нет, но twitchId из токена совпал
              try {
                  // Используем JWT токен пользователя для запроса к Twitch
                  const userTwitchClient = await getTwitchClientWithToken(token);
                  if (!userTwitchClient) throw new Error('Failed to initialize Twitch client with User Token');
                  
                  // Запрашиваем фолловеров (требует User Token)
                  let currentFollowersCount = profileData?.twitch_follower_count ?? null; // Берем старое значение как fallback
                  try {
                      const followsResponse = await userTwitchClient.channels.getChannelFollowers(userId, userId, undefined, 1);
                      currentFollowersCount = followsResponse?.total ?? 0;
                      console.log(`[API /api/twitch/user] Fetched current followers for owner ${userId}: ${currentFollowersCount}`);
                  } catch (followError) {
                      console.error(`[API /api/twitch/user] Error fetching followers using User Token for ${userId}:`, followError);
                      // Не прерываем, используем старое значение или null
                  }
                  
                  // Берем broadcaster_type из уже полученных публичных данных
                  const currentBroadcasterType = twitchUserData.broadcaster_type;
                  
                  // Определяем роль
                  const currentRole = determineRole(currentFollowersCount, currentBroadcasterType);
                  console.log(`[API /api/twitch/user] Determined role for ${userId}: ${currentRole}`);
                  
                  // Обновляем или создаем запись в user_profiles (Upsert)
                  console.log(`[API /api/twitch/user] Upserting profile data for Supabase User ${supabaseUserId}...`);
                  const { data: upsertData, error: upsertError } = await supabaseAdmin
                      .from('user_profiles')
                      .upsert({
                          user_id: supabaseUserId, // ID пользователя Supabase
                          twitch_user_id: userId,   // ID канала Twitch ИЗ ЗАПРОСА
                          twitch_display_name: twitchUserData.display_name,
                          twitch_profile_image_url: twitchUserData.profile_image_url,
                          twitch_follower_count: currentFollowersCount, 
                          twitch_broadcaster_type: currentBroadcasterType,
                          role: currentRole,
                          updated_at: new Date().toISOString()
                      })
                      .select() 
                      .single();

                  if (upsertError) {
                       console.error(`[API /api/twitch/user] Error upserting profile for ${supabaseUserId}:`, upsertError);
                       // Не прерываем, вернем старые или базовые данные
                  } else if (upsertData) {
                      console.log(`[API /api/twitch/user] Profile data upserted successfully for ${supabaseUserId}.`);
                      profileData = upsertData; // Обновляем profileData для возврата
                  }
                  
              } catch (refreshError) {
                    console.error(`[API /api/twitch/user] Error during owner data refresh for ${userId}:`, refreshError);
                    // Не удалось обновить, profileData останется старым (если был) или null
              }
          } else {
                console.log(`[API /api/twitch/user] Not owner viewing or owner check failed, skipping data refresh and upsert for profile ${userId}.`);
          }
          
      } else {
          console.warn(`[API /api/twitch/user] Invalid or expired token provided for userId ${userId}. Proceeding without profile data or refresh.`);
      }
  } else {
       console.log(`[API /api/twitch/user] No token provided for userId ${userId}. Fetching public data only.`);
  }
  
  // --- Финальная подготовка данных для ответа --- 
  // Обновляем followers_count в twitchUserData из profileData, если он там есть
  if (profileData?.twitch_follower_count !== null && profileData?.twitch_follower_count !== undefined) {
       twitchUserData.followers_count = profileData.twitch_follower_count;
  }

  const responsePayload = {
      twitch_user: twitchUserData,
      profile: profileData // Содержит данные из Supabase, включая кэш фолловеров/роли
  };

  console.log(`[API /api/twitch/user] Successfully processed request for Twitch User ID: ${userId}. Returning payload:`, { twitch_user: { ...twitchUserData, videos: `[${videos.length} videos]` }, profile: profileData });
  return NextResponse.json(responsePayload, { status: 200 });
}

export const dynamic = 'force-dynamic'; 