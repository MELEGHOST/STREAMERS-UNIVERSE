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

  let profileData = null; 
  let isOwnerViewing = false;
  let supabaseUserIdFromTwitchId = null; 
  let twitchUserData = null;
  let videos = [];
  let followersCountFromTwitch = null; // <<< Для фолловеров с App Token

  // --- Получение публичных данных с Twitch (ВКЛЮЧАЯ ФОЛЛОВЕРОВ) --- 
  try {
      const appTwitchClient = await getTwitchClient(); 
      if (!appTwitchClient) throw new Error('Failed to initialize Twitch App client');

      console.log(`[API /api/twitch/user] Fetching public data for user ${userId} from Twitch API...`);
      const userResponse = await appTwitchClient.users.getUserById(userId);
      if (!userResponse) {
        console.warn(`[API /api/twitch/user] Twitch user with ID ${userId} not found.`);
        return NextResponse.json({ error: 'Twitch user not found' }, { status: 404 });
      }
      console.log(`[API /api/twitch/user] Twitch user data fetched successfully.`);

      // --- Получаем ФОЛЛОВЕРОВ (публично, через App Token) ---
      try {
          // Используем helix-метод напрямую, т.к. в @twurple может не быть для AppToken
          const followsResponse = await appTwitchClient.callApi({
               url: 'channels/followers',
               type: 'helix',
               query: {
                   broadcaster_id: userId,
                   first: 1 // Нам нужно только общее число
               }
           });
           followersCountFromTwitch = followsResponse?.total ?? 0;
           console.log(`[API /api/twitch/user] Fetched public followers for ${userId}: ${followersCountFromTwitch}`);
       } catch (publicFollowError) {
           console.error(`[API /api/twitch/user] Error fetching public followers for ${userId}:`, publicFollowError);
           // Не прерываем, будет null
       }

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
        followers_count: followersCountFromTwitch, // <<< Используем полученных фолловеров
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
  
  // --- Поиск профиля в базе и определение isOwnerViewing --- 
  try {
      // 1. Ищем пользователя в auth.users по Twitch ID (provider_id)
      console.log(`[API /api/twitch/user] Looking up Supabase user ID for Twitch ID: ${userId}`);
      const { data: authUser, error: authUserError } = await supabaseAdmin
          // Явно указываем схему 'auth' и таблицу 'users'
          .from('users')
          .select('id')
          // Пробуем снова стандартный метод для JSONB
          .eq('raw_user_meta_data->>provider_id', userId) 
          .maybeSingle();

      if (authUserError) {
          // Если ошибка "does not exist", возможно, нейминг колонки другой?
          // Или права доступа? Логируем и продолжаем без ID.
          console.error(`[API /api/twitch/user] Error fetching user from auth.users for Twitch ID ${userId}:`, authUserError);
      } else if (authUser) {
          supabaseUserIdFromTwitchId = authUser.id;
          console.log(`[API /api/twitch/user] Found Supabase User ID: ${supabaseUserIdFromTwitchId} for Twitch ID ${userId}`);
          
          // 2. Если нашли Supabase User ID, ищем профиль в user_profiles
          const { data: profile, error: profileError } = await supabaseAdmin
              .from('user_profiles')
              .select('*') 
              .eq('user_id', supabaseUserIdFromTwitchId)
              .maybeSingle(); 

          if (profileError && profileError.code !== 'PGRST116') {
              console.error(`[API /api/twitch/user] Error fetching profile for user_id ${supabaseUserIdFromTwitchId}:`, profileError);
          } else if (profile) {
              profileData = profile; 
              console.log(`[API /api/twitch/user] User profile found in Supabase for user_id ${supabaseUserIdFromTwitchId}`);
          } else {
              console.log(`[API /api/twitch/user] User profile NOT found in Supabase for user_id ${supabaseUserIdFromTwitchId}`);
          }
      } else {
           console.log(`[API /api/twitch/user] No user found in auth.users for Twitch ID ${userId}. User is not registered.`);
      }

      // 3. Определяем isOwnerViewing: если есть токен и ID из токена совпадает с найденным ID
      if (token) {
          const verifiedToken = await verifyJwt(token);
          if (verifiedToken && supabaseUserIdFromTwitchId && verifiedToken.sub === supabaseUserIdFromTwitchId) {
                isOwnerViewing = true;
                console.log(`[API /api/twitch/user] Logged-in user ${verifiedToken.sub} owns the requested profile ${userId}.`);
          } else if (verifiedToken) {
                console.log(`[API /api/twitch/user] Logged-in user ${verifiedToken.sub} does NOT own the requested profile ${userId} (Owner Supabase ID: ${supabaseUserIdFromTwitchId}).`);
          } else {
               console.warn(`[API /api/twitch/user] Invalid or expired token provided.`);
          }
      } else {
          console.log(`[API /api/twitch/user] No token provided, cannot determine owner.`);
      }

  } catch (lookupError) {
      console.error("[API /api/twitch/user] Error during profile lookup:", lookupError);
  }

  // --- Обновление данных, если владелец смотрит свой профиль --- 
  console.log(`[API /api/twitch/user] Checking ownership before update: isOwnerViewing = ${isOwnerViewing}`);
  if (isOwnerViewing && supabaseUserIdFromTwitchId) { // <<< Добавил проверку supabaseUserIdFromTwitchId
      try {
            const currentSupabaseUserId = supabaseUserIdFromTwitchId; 
            
            // Запрашиваем фолловеров СНОВА, но уже с User Token (если он нужен для более точных данных или других целей)
            // Если публичных данных достаточно, этот блок можно упростить/удалить
            let currentFollowersCount = followersCountFromTwitch; // Начинаем с публичных данных
            try {
                 const userTwitchClient = await getTwitchClientWithToken(token);
                 if (userTwitchClient) {
                     const followsResponse = await userTwitchClient.channels.getChannelFollowers(userId, userId, undefined, 1);
                     currentFollowersCount = followsResponse?.total ?? followersCountFromTwitch ?? 0;
                     console.log(`[API /api/twitch/user] Fetched current followers using USER TOKEN for owner ${userId}: ${currentFollowersCount}`);
                 } else {
                     console.warn(`[API /api/twitch/user] Could not get user token client, using public follower count: ${currentFollowersCount}`);
                 }
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
            console.log(`[API /api/twitch/user] Determined role for owner ${userId}: ${currentRole}`);
            
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
                console.log(`[API /api/twitch/user] Attempting to UPDATE existing profile for Supabase User ${currentSupabaseUserId}...`);
                const { data, error } = await supabaseAdmin
                    .from('user_profiles')
                    .update(dataToUpdateOrInsert)
                    .eq('user_id', currentSupabaseUserId) // <<< Используем найденный ID
                    .select()
                    .single();
                updatedProfileData = data;
                dbError = error;
            } else { // Профиля нет, создаем
                 console.log(`[API /api/twitch/user] Attempting to INSERT new profile for Supabase User ${currentSupabaseUserId}...`);
                const dataToInsert = {
                    ...dataToUpdateOrInsert,
                    user_id: currentSupabaseUserId,
                    // twitch_user_id: userId, // <<< УБРАНО ОКОНЧАТЕЛЬНО
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
                 console.error(`[API /api/twitch/user] Error during DB update/insert for ${currentSupabaseUserId}:`, dbError);
            } else if (updatedProfileData) {
                console.log(`[API /api/twitch/user] Profile DB operation successful for ${currentSupabaseUserId}.`);
                profileData = { ...(profileData || {}), ...updatedProfileData }; 
                console.log(`[API /api/twitch/user] Merged profileData after DB operation:`, profileData);
            }
            
      } catch (refreshError) {
           console.error(`[API /api/twitch/user] Error inside owner data refresh block for ${userId}:`, refreshError);
      }
  } else {
      console.log(`[API /api/twitch/user] Skipping DB update/insert because isOwnerViewing is ${isOwnerViewing} or SupabaseUserID not found.`);
  }
  
  // --- Финальная подготовка данных для ответа --- 
  // Убедимся, что followers_count в twitchUserData актуален (из публичных данных)
  if (twitchUserData) {
      twitchUserData.followers_count = followersCountFromTwitch ?? twitchUserData.followers_count; 
  }
  
  const responsePayload = {
      twitch_user: twitchUserData,
      profile: profileData 
  };

  console.log(`[API /api/twitch/user] Successfully processed request for Twitch User ID: ${userId}. Returning payload:`, { twitch_user: { ...twitchUserData, videos: `[${videos.length} videos]` }, profile: profileData });
  return NextResponse.json(responsePayload, { status: 200 });
}

export const dynamic = 'force-dynamic'; 