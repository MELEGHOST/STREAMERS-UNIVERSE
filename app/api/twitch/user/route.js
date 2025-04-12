import { NextResponse } from 'next/server';
import { getTwitchClient /*, getTwitchClientWithToken */ } from '../../../utils/twitchClient';
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
  let followersCountFromTwitch = null; 

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
        followers_count: followersCountFromTwitch,
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
      // 1. Ищем пользователя в auth.users по Twitch ID (provider_id) - Возвращаем listUsers()
      console.log(`[API /api/twitch/user] Looking up Supabase user ID via listUsers() for Twitch ID: ${userId}`);
      const { data: { users: allAuthUsers }, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers({
          // Нельзя фильтровать по provider_id здесь, получаем всех
          // page: 1, perPage: 1000 // Можно добавить пагинацию для оптимизации
      });
      
      let authUser = null;
      if (listUsersError) {
           console.error(`[API /api/twitch/user] Error listing users from auth.users:`, listUsersError);
      } else {
           // <<< ИЗМЕНЯЕМ ЛОГИКУ ПОИСКА >>>
           console.log(`[API /api/twitch/user] Searching for user with Twitch ID ${userId} in ${allAuthUsers.length} users...`);
           for (const u of allAuthUsers) {
               // Логируем структуру identities для отладки (можно будет убрать)
               // console.log(`[API /api/twitch/user] Checking user ${u.id}, identities:`, u.identities);
               if (u.identities && Array.isArray(u.identities)) {
                   const twitchIdentity = u.identities.find(
                       identity => identity.provider === 'twitch' && identity.provider_id === userId
                   );
                   if (twitchIdentity) {
                       console.log(`[API /api/twitch/user] Found matching Twitch identity for user ${u.id}`);
                       authUser = u; // Нашли!
                       break; // Выходим из цикла
                   }
               } else if (u.raw_user_meta_data?.provider_id === userId) {
                   // Оставляем старую проверку как fallback (на всякий случай)
                    console.warn(`[API /api/twitch/user] Found user ${u.id} by fallback raw_user_meta_data check.`);
                    authUser = u;
                    break;
               }
           }

           // Старый поиск (закомментирован)
           // authUser = allAuthUsers.find(u => u.raw_user_meta_data?.provider_id === userId);
           
           if (!authUser) {
               console.log(`[API /api/twitch/user] User with Twitch ID ${userId} not found after checking identities.`);
           }
      }

      if (authUser) {
          supabaseUserIdFromTwitchId = authUser.id;
          console.log(`[API /api/twitch/user] Found Supabase User ID: ${supabaseUserIdFromTwitchId} for Twitch ID ${userId} (via identities)`);
          
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
           console.log(`[API /api/twitch/user] Could not find Supabase User ID for Twitch ID ${userId}. User might not be registered.`);
      }

      // 3. Определяем isOwnerViewing
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
  if (isOwnerViewing && supabaseUserIdFromTwitchId) { 
      try {
            const currentSupabaseUserId = supabaseUserIdFromTwitchId; 
            
            let currentFollowersCount = followersCountFromTwitch;
            console.log(`[API /api/twitch/user] Using public follower count for owner update: ${currentFollowersCount}`);
           
            const currentBroadcasterType = twitchUserData.broadcaster_type;
            const currentRole = determineRole(currentFollowersCount, currentBroadcasterType);
            console.log(`[API /api/twitch/user] Determined role for owner ${userId}: ${currentRole}`);
            
            const dataToUpdateOrInsert = {
                twitch_follower_count: currentFollowersCount, 
                twitch_broadcaster_type: currentBroadcasterType,
                role: currentRole,
                updated_at: new Date().toISOString(),
            };

            // Удаляем ключи с undefined перед отправкой в базу
            Object.keys(dataToUpdateOrInsert).forEach(key => {
                if (dataToUpdateOrInsert[key] === undefined) {
                    delete dataToUpdateOrInsert[key];
                }
            });

            console.log(`[API /api/twitch/user] Data prepared for DB operation:`, dataToUpdateOrInsert);
            // <<< Лог: Текущее значение profileData ПЕРЕД операцией >>>
            console.log('[API /api/twitch/user] Current profileData before DB operation:', profileData);

            let updatedProfileData = null;
            let dbError = null;

            if (profileData) { // Профиль существует, обновляем
                console.log(`[API /api/twitch/user] Attempting to UPDATE existing profile for Supabase User ${currentSupabaseUserId}...`);
                const { data: updateResult, error: updateError } = await supabaseAdmin
                    .from('user_profiles')
                    .update(dataToUpdateOrInsert)
                    .eq('user_id', currentSupabaseUserId) 
                    .select() // <<< Убеждаемся, что select есть
                    .single();
                updatedProfileData = updateResult;
                dbError = updateError;
                // <<< Лог: Результат UPDATE >>>
                console.log('[API /api/twitch/user] UPDATE Result:', { updateResult, updateError });
            } else { // Профиля нет, создаем
                 console.log(`[API /api/twitch/user] Attempting to INSERT new profile for Supabase User ${currentSupabaseUserId}...`);
                const dataToInsert = {
                    ...dataToUpdateOrInsert,
                    user_id: currentSupabaseUserId,
                    twitch_login: twitchUserData.login, 
                    twitch_display_name: twitchUserData.display_name,
                    twitch_profile_image_url: twitchUserData.profile_image_url,
                    description: twitchUserData.description, 
                    role: currentRole || determineRole(followersCountFromTwitch, twitchUserData.broadcaster_type), 
                };
                 Object.keys(dataToInsert).forEach(key => {
                   if (dataToInsert[key] === undefined) { 
                      delete dataToInsert[key]; 
                    }
                });
                
                console.log(`[API /api/twitch/user] Data prepared for INSERT:`, dataToInsert);

                const { data: insertResult, error: insertError } = await supabaseAdmin
                    .from('user_profiles')
                    .insert(dataToInsert)
                    .select() // <<< Убеждаемся, что select есть
                    .single();
                updatedProfileData = insertResult;
                dbError = insertError;
                 // <<< Лог: Результат INSERT >>>
                console.log('[API /api/twitch/user] INSERT Result:', { insertResult, insertError });
            }

            if (dbError) {
                console.error(`[API /api/twitch/user] Database ${profileData ? 'UPDATE' : 'INSERT'} error for user ${currentSupabaseUserId}:`, dbError);
            } else if (updatedProfileData) {
                console.log(`[API /api/twitch/user] Database ${profileData ? 'UPDATE' : 'INSERT'} successful for user ${currentSupabaseUserId}.`);
                // <<< Лог: Значение profileData ПЕРЕД присваиванием >>>
                console.log('[API /api/twitch/user] profileData BEFORE assignment:', profileData);
                profileData = updatedProfileData; 
                // <<< Лог: Значение profileData ПОСЛЕ присваивания >>>
                console.log('[API /api/twitch/user] profileData AFTER assignment:', profileData);
            } else {
                 console.warn(`[API /api/twitch/user] Database ${profileData ? 'UPDATE' : 'INSERT'} operation did not return data or error for user ${currentSupabaseUserId}.`);
            }

      } catch (ownerUpdateError) {
          console.error(`[API /api/twitch/user] Error during owner profile update/insert for ${userId}:`, ownerUpdateError);
      }
  } else {
      console.log(`[API /api/twitch/user] Skipping DB update/insert because isOwnerViewing is ${isOwnerViewing} or SupabaseUserID not found.`);
  }
  
  // --- Финальная подготовка данных для ответа --- 
  if (twitchUserData) {
      twitchUserData.followers_count = followersCountFromTwitch ?? twitchUserData.followers_count; 
  }
  
  // <<< Лог: Финальное значение profileData перед возвратом >>>
  console.log(`[API /api/twitch/user] Returning final profileData:`, profileData);
  
  // --- Возвращаем данные ---
  return NextResponse.json({ 
      twitch_user: twitchUserData, 
      profile: profileData 
  });
}

export const dynamic = 'force-dynamic'; 