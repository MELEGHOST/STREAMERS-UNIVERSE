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
        .select('description, social_links')
        .eq('user_id', userId)
        .single();

    if (error) {
        console.error(`[Achievements] Error fetching profile for user ${userId}:`, error);
        return null;
    }
    return data;
}

// Центральный обработчик триггеров достижений
export async function handleAchievementTrigger(userId, triggerType, payload = {}) {
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

      if (triggerType === 'REVIEW_CREATED') {
        const reviewCount = await getUserReviewCount(userId);
        currentProgress = reviewCount;
        if (reviewCount >= achievement.trigger_value) {
          isUnlocked = true;
        }
      } else if (triggerType === 'USER_FOLLOWED') {
        // Если количество передано напрямую, используем его
        if (typeof payload.count === 'number') {
          currentProgress = payload.count;
          if (currentProgress >= achievement.trigger_value) {
            isUnlocked = true;
          }
        }
        // В противном случае, логика подсчета должна быть где-то еще, здесь мы ее не дублируем
      } else if (triggerType === 'PROFILE_UPDATED') {
        const profile = await getUserProfile(userId);
        if (!profile) continue;

        // Проверяем конкретное условие для ачивки
        if (achievement.trigger_string === 'has_description' && profile.description) {
          isUnlocked = true;
          currentProgress = 1;
        } else if (achievement.trigger_string === 'has_social_links') {
          const socialLinks = profile.social_links || {};
          const linkCount = Object.values(socialLinks).filter(link => link).length;
          currentProgress = linkCount;
          if (linkCount >= achievement.trigger_value) {
            isUnlocked = true;
          }
        }
      }
      // ... здесь можно будет добавить другие типы триггеров (USER_FOLLOWED, etc.)

      // 3. Если достижение открыто, записываем его в базу
      if (isUnlocked) {
        console.log(`[Achievements] Unlocking achievement '${achievement.name}' for user ${userId}`);
        const { error: insertError } = await supabaseAdmin
          .from('user_achievements')
          .insert({
            user_id: userId,
            achievement_id: achievement.id,
            unlocked_at: new Date().toISOString(),
            current_progress: currentProgress,
          });

        if (insertError) {
          console.error(`[Achievements] Error inserting achievement '${achievement.name}' for user ${userId}:`, insertError);
        } else {
          console.log(`[Achievements] Successfully unlocked '${achievement.name}'!`);
        }
      }
    }
  } catch (error) {
    console.error(`[Achievements] General error in handleAchievementTrigger for user ${userId}:`, error);
  }
} 