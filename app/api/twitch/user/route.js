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
          
          // 1. Получаем профиль запрашиваемого пользователя из user_profiles по twitch_user_id
          try {
              console.log(`[API /api/twitch/user] Fetching profile from Supabase for twitch_user_id: ${userId}`);
              const { data: profile, error: profileError } = await supabaseAdmin
                  .from('user_profiles')
                  .select('*') 
                  // Ищем по twitch_user_id, а не по user_id авторизованного пользователя!
                  .eq('twitch_user_id', userId) 
                  .maybeSingle(); // Используем maybeSingle, т.к. профиля может не быть
                  
              if (profileError && profileError.code !== 'PGRST116') { // PGRST116 - это "No rows found", это не ошибка
                  console.error(`[API /api/twitch/user] Error fetching profile for twitch_user_id ${userId}:`, profileError);
              } else if (profile) {
                  profileData = profile; 
                  console.log(`[API /api/twitch/user] User profile found in Supabase for twitch_user_id ${userId}`);
                  // Проверяем, принадлежит ли найденный профиль авторизованному пользователю
                  // Это нужно только для того, чтобы понять, нужно ли обновлять данные (upsert)
                  if (verifiedToken && profileData.user_id === verifiedToken.sub) {
                      isOwnerViewing = true;
                      console.log(`[API /api/twitch/user] Logged-in user ${verifiedToken.sub} owns the requested profile ${userId}. Will attempt data refresh.`);
                  }
              } else {
                  console.log(`[API /api/twitch/user] User profile NOT found in Supabase for twitch_user_id ${userId}`);
                  // Если профиля нет, проверяем, авторизованный ли пользователь запрашивает СВОЙ ID
                  const twitchIdFromToken = verifiedToken?.user_metadata?.provider_id; 
                  if (twitchIdFromToken && twitchIdFromToken === userId) {
                       console.log(`[API /api/twitch/user] Logged-in user ${verifiedToken.sub} is requesting their own unsaved profile ${userId}. Will attempt upsert.`);
                       isOwnerViewing = true; // Ставим флаг для попытки upsert при первом заходе
                  }
              }
          } catch (e) {
               console.error("[API /api/twitch/user] Unexpected error during Supabase profile fetch:", e);
          }
          
          // 2. Если АВТОРИЗОВАННЫЙ ПОЛЬЗОВАТЕЛЬ смотрит СВОЙ профиль, пытаемся обновить данные
          console.log(`[API /api/twitch/user] Checking ownership: isOwnerViewing = ${isOwnerViewing}`);
          if (isOwnerViewing) { 
              try {
                  // Используем JWT токен пользователя для запроса к Twitch
                  const userTwitchClient = await getTwitchClientWithToken(token);
                  if (!userTwitchClient) throw new Error('Failed to initialize Twitch client with User Token');
                  
                  // Запрашиваем фолловеров (требует User Token)
                  let currentFollowersCount = profileData?.twitch_follower_count ?? null; 
                  try {
                      const followsResponse = await userTwitchClient.channels.getChannelFollowers(userId, userId, undefined, 1);
                      currentFollowersCount = followsResponse?.total ?? 0;
                      console.log(`[API /api/twitch/user] Fetched current followers for owner ${userId}: ${currentFollowersCount}`);
                  } catch (followError) {
                      // Мягкая обработка ошибки токена
                      if (followError.message?.includes('Invalid token') || followError.message?.includes('invalid access token')) {
                          console.warn(`[API /api/twitch/user] Failed to fetch followers due to invalid token for ${userId}. Using stale data: ${currentFollowersCount}`);
                      } else {
                           console.error(`[API /api/twitch/user] Error fetching followers using User Token for ${userId}:`, followError);
                      }
                      // Не прерываем выполнение, используем старое значение (currentFollowersCount)
                  }
                  
                  const currentBroadcasterType = twitchUserData.broadcaster_type;
                  const currentRole = determineRole(currentFollowersCount, currentBroadcasterType);
                  console.log(`[API /api/twitch/user] Determined role for ${userId}: ${currentRole}`);
                  
                  const dataToUpdateOrInsert = {
                      twitch_follower_count: currentFollowersCount, 
                      twitch_broadcaster_type: currentBroadcasterType,
                      role: currentRole,
                      updated_at: new Date().toISOString(),
                  };

                  // Удаляем ключи с undefined/null перед отправкой в базу
                  Object.keys(dataToUpdateOrInsert).forEach(key => {
                      if (dataToUpdateOrInsert[key] === undefined || dataToUpdateOrInsert[key] === null) {
                          // Для update: если хотим обнулить поле, ставим null явно.
                          // Если не хотим трогать поле, если значение null/undefined, то удаляем ключ.
                          // В данном случае, если followerCount === null, мы хотим его записать.
                          // Если role/broadcaster_type - null/undefined, возможно, тоже хотим записать.
                          // Пока оставляем как есть, но это место для потенциального улучшения.
                      }
                  });

                  console.log(`[API /api/twitch/user] Data prepared for DB operation:`, dataToUpdateOrInsert);

                  let updatedProfileData = null;
                  let dbError = null;

                  if (profileData) { // Профиль существует, обновляем
                      console.log(`[API /api/twitch/user] Attempting to UPDATE existing profile for Supabase User ${supabaseUserId}...`);
                      const { data, error } = await supabaseAdmin
                          .from('user_profiles')
                          .update(dataToUpdateOrInsert)
                          .eq('user_id', supabaseUserId)
                          .select()
                          .single();
                      updatedProfileData = data;
                      dbError = error;
                  } else { // Профиля нет, создаем
                      console.log(`[API /api/twitch/user] Attempting to INSERT new profile for Supabase User ${supabaseUserId}...`);
                      const dataToInsert = {
                          ...dataToUpdateOrInsert,
                          user_id: supabaseUserId,
                          twitch_user_id: userId, 
                      };
                      console.log(`[API /api/twitch/user] Data for INSERT:`, dataToInsert);
                      const { data, error } = await supabaseAdmin
                          .from('user_profiles')
                          .insert(dataToInsert)
                          .select()
                          .single();
                      updatedProfileData = data;
                      dbError = error;
                  }

                  console.log(`[API /api/twitch/user] DB operation result: dbError =`, dbError, `, updatedProfileData =`, updatedProfileData);

                  if (dbError) {
                       console.error(`[API /api/twitch/user] Error during DB update/insert for ${supabaseUserId}:`, dbError);
                  } else if (updatedProfileData) {
                      console.log(`[API /api/twitch/user] Profile DB operation successful for ${supabaseUserId}.`);
                      profileData = { ...(profileData || {}), ...updatedProfileData }; 
                      console.log(`[API /api/twitch/user] Merged profileData after DB operation:`, profileData);
                  }
                  
              } catch (refreshError) {
                    console.error(`[API /api/twitch/user] Error inside owner data refresh block for ${userId}:`, refreshError);
              }
          } else {
              console.log(`[API /api/twitch/user] Skipping DB update/insert because isOwnerViewing is false.`);
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