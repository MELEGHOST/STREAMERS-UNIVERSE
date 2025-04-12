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
               // Логируем identities и raw_user_meta_data
               console.log(`[API /api/twitch/user] Checking user ${u.id}. Identities:`, u.identities, "Raw User Meta:" , u.raw_user_meta_data);
               if (u.identities && Array.isArray(u.identities)) {
                   const twitchIdentity = u.identities.find(
                       identity => identity.provider === 'twitch' && identity.provider_id === userId
                   );
                   if (twitchIdentity) {
                       console.log(`[API /api/twitch/user] Found matching Twitch identity for user ${u.id}`);
                       authUser = u; // Нашли!
                       break; // Выходим из цикла
                   }
                // <<< ИЗМЕНЯЕМ ПРОВЕРКУ FALLBACK >>>
               } else if (u.raw_user_meta_data && u.raw_user_meta_data.provider_id === userId) { 
                   // Проверяем конкретно raw_user_meta_data.provider_id
                    console.warn(`[API /api/twitch/user] Found user ${u.id} by fallback raw_user_meta_data.provider_id check.`);
                    authUser = u;
                    break;
               } else if (u.raw_user_meta_data && u.raw_user_meta_data.user_name === userId) {
                   // <<< ДОБАВЛЯЕМ ПРОВЕРКУ raw_user_meta_data.user_name >>>
                   // Иногда Twitch ID может быть в user_name, если login занят?
                   console.warn(`[API /api/twitch/user] Found user ${u.id} by fallback raw_user_meta_data.user_name check.`);
                   authUser = u;
                   break;
               } else {
                    // <<< ЛОГИРУЕМ, если не нашли ни там, ни там >>>
                    console.log(`[API /api/twitch/user] No match for user ${u.id} in identities or known raw_user_meta_data fields.`);
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
            
            // Данные для UPSERT
            const dataToUpsert = {
                user_id: currentSupabaseUserId, // Обязательно для upsert
                twitch_follower_count: currentFollowersCount, 
                twitch_broadcaster_type: currentBroadcasterType,
                role: currentRole,
                updated_at: new Date().toISOString(),
                // Добавляем базовые данные из Twitch, если их нет в профиле (для INSERT части upsert)
                twitch_login: profileData?.twitch_login ?? twitchUserData.login, 
                twitch_display_name: profileData?.twitch_display_name ?? twitchUserData.display_name,
                twitch_profile_image_url: profileData?.twitch_profile_image_url ?? twitchUserData.profile_image_url,
                description: profileData?.description ?? twitchUserData.description, // Описание из профиля или Twitch
            };

            // Удаляем ключи с undefined
            Object.keys(dataToUpsert).forEach(key => {
                if (dataToUpsert[key] === undefined) {
                    delete dataToUpsert[key];
                }
            });

            console.log(`[API /api/twitch/user] Data prepared for UPSERT operation:`, dataToUpsert);
            console.log('[API /api/twitch/user] Current profileData before DB operation:', profileData);

            // <<< ИСПОЛЬЗУЕМ UPSERT >>>
            const { data: upsertResult, error: upsertError } = await supabaseAdmin
                .from('user_profiles')
                .upsert(dataToUpsert, { onConflict: 'user_id' }) // Указываем конфликт по user_id
                .select() // Выбираем результат (вставленный или обновленный)
                .single(); // Ожидаем одну строку

            console.log('[API /api/twitch/user] UPSERT Result:', { upsertResult, upsertError });

            if (upsertError) {
                console.error(`[API /api/twitch/user] Database UPSERT error for user ${currentSupabaseUserId}:`, upsertError);
                // Не прерываем, но profileData может остаться старым/null
            } else if (upsertResult) {
                console.log(`[API /api/twitch/user] Database UPSERT successful for user ${currentSupabaseUserId}.`);
                console.log('[API /api/twitch/user] profileData BEFORE assignment:', profileData);
                profileData = upsertResult; // Присваиваем результат upsert
                console.log('[API /api/twitch/user] profileData AFTER assignment:', profileData);
            } else {
                 console.warn(`[API /api/twitch/user] Database UPSERT operation did not return data or error for user ${currentSupabaseUserId}.`);
            }

      } catch (ownerUpdateError) {
          console.error(`[API /api/twitch/user] Error during owner profile upsert for ${userId}:`, ownerUpdateError);
      }
  } else {
      // <<< Исправляем лог >>>
      console.log(`[API /api/twitch/user] Skipping DB upsert because isOwnerViewing is ${isOwnerViewing} or SupabaseUserID not found.`);
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