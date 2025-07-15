import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Функция для получения количества обзоров пользователя
async function getUserReviewCount(userId) {
  const { count, error } = await supabaseAdmin
    .from('reviews')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  if (error) {
    console.error(`[Achievements] Error fetching review count for user ${userId}:`, error);
    return 0;
  }
  return count;
}

// Функция для получения профиля пользователя
async function getUserProfile(userId) {
    const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('description, social_links, broadcaster_type')
        .eq('user_id', userId)
        .single();

    if (error) {
        console.error(`[Achievements] Error fetching profile for user ${userId}:`, error);
        return null;
    }
    return data;
}

async function getReferralCount(userId) {
  try {
    const { count, error } = await supabaseAdmin.from('user_profiles').select('*', { count: 'exact', head: true }).eq('referrer_id', userId);
    if (error) throw error;
    return count;
  } catch (e) {
    console.error(e);
    return 0;
  }
}
async function getUserAchievementCount(userId) {
  const { count, error } = await supabaseAdmin.from('user_achievements').select('*', { count: 'exact', head: true }).eq('user_id', userId);
  if (error) {
    console.error(`[Achievements] Error fetching achievement count for user ${userId}:`, error);
    return 0;
  }
  return count;
}

// Центральный обработчик триггеров достижений
export async function handleAchievementTrigger(userId, triggerType, payload = {}) {
  if (!userId) {
    console.error('No userId provided');
    return;
  }
  // Validate userId as UUID or string
  if (typeof userId !== 'string' || userId.length < 10) return;
  console.log(`[Achievements] Handling trigger '${triggerType}' for user ${userId}`);

  try {
    // 1. Получаем все достижения, связанные с этим типом триггера, которые пользователь еще не получил
    const { data: achievements, error: achievementsError } = await supabaseAdmin
      .from('achievements')
      .select('*, user_achievements(user_id)')
      .eq('trigger_type', triggerType)
      .eq('is_enabled', true)
      .is('user_achievements.user_id', null); // <<< Ключевое условие!

    if (achievementsError) throw achievementsError;
    if (!achievements || achievements.length === 0) {
      console.log(`[Achievements] No new achievements to check for trigger '${triggerType}' for user ${userId}`);
      return;
    }

    console.log(`[Achievements] Found ${achievements.length} potential new achievements to check.`);

    // 2. Проверяем условия для каждого достижения
    for (const achievement of achievements) {
      let isUnlocked = false;
      let currentProgress = 0;
      let profile = null; // Кэшируем профиль, если нужен
      if (triggerType === 'review_count') {
        currentProgress = await getUserReviewCount(userId);
        if (currentProgress >= achievement.trigger_value) isUnlocked = true;
      } else if (triggerType === 'twitch_followers') {
        if (typeof payload.count === 'number') {
          currentProgress = payload.count;
          if (currentProgress >= achievement.trigger_value) isUnlocked = true;
        }
      } else if (triggerType === 'social_links') {
        profile = await getUserProfile(userId);
        if (profile) {
          const socialLinks = profile.social_links || {};
          currentProgress = Object.values(socialLinks).filter(link => link).length;
          if (currentProgress >= achievement.trigger_value) isUnlocked = true;
        }
      } else if (triggerType === 'twitch_status' || triggerType === 'twitch_partner') {
        profile = profile || await getUserProfile(userId);
        if (profile && profile.broadcaster_type) {
          const isMatch = triggerType === 'twitch_partner' ? profile.broadcaster_type === 'partner' : profile.broadcaster_type === achievement.trigger_string;
          if (isMatch) {
            isUnlocked = true;
            currentProgress = 1;
          }
        }
      } else if (triggerType === 'referrals') {
        currentProgress = await getReferralCount(userId);
        if (currentProgress >= achievement.trigger_value) isUnlocked = true;
      } else if (triggerType === 'achievements_unlocked') {
        currentProgress = await getUserAchievementCount(userId);
        if (currentProgress >= achievement.trigger_value) isUnlocked = true;
      }
      // Добавить другие типы по мере необходимости
      if (isUnlocked) {
        console.log(`[Achievements] Unlocking achievement '${achievement.name}' for user ${userId}`);
        const { data: existing } = await supabaseAdmin.from('user_achievements').select('id').eq('user_id', userId).eq('achievement_id', achievement.id).single();
        if (existing) {
          console.log(`[Achievements] Achievement '${achievement.name}' already unlocked for user ${userId}. Skipping.`);
          continue;
        }
        // For referrals, add cap:
        if (triggerType === 'referrals') {
          const count = await getReferralCount(userId);
          if (count > 50) {
            console.log(`[Achievements] Referral count for user ${userId} exceeds 50. Skipping achievement '${achievement.name}'.`);
            continue;
          }
        }
        const { error: insertError } = await supabaseAdmin.from('user_achievements').insert({
          user_id: userId,
          achievement_id: achievement.id,
          unlocked_at: new Date().toISOString(),
          current_progress: currentProgress,
        });
        if (insertError) {
          console.error(`[Achievements] Error inserting achievement '${achievement.name}' for user ${userId}:`, insertError);
        } else {
          console.log(`[Achievements] Successfully unlocked '${achievement.name}'!`);
          // Проверяем коллекционера
          await handleAchievementTrigger(userId, 'achievements_unlocked', { count: await getUserAchievementCount(userId) });
        }
      }
    }
  } catch (error) {
    console.error(`[Achievements] General error in handleAchievementTrigger for user ${userId}:`, error);
  }
} 

export async function getAchievements() {
  try {
    const { data } = await supabaseAdmin.from('achievements').select('*');
    return data || [];
  } catch (e) {
    console.error(e);
    return [];
  }
}
export async function getAchievementRarity(achievementId) {
  try {
    const { count: totalActive } = await supabaseAdmin.from('user_profiles').select('*', { count: 'exact' }).gte('last_login', new Date(Date.now() - 30*24*60*60*1000).toISOString());
    const { count: unlocked } = await supabaseAdmin.from('user_achievements').select('*', { count: 'exact' }).eq('achievement_id', achievementId);
    return totalActive > 0 ? (unlocked / totalActive) * 100 : 0;
  } catch (e) {
    console.error(e);
    return 0;
  }
} 

export { getAchievements, getAchievementRarity }; 