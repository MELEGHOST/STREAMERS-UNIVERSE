import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJwt } from '../../utils/jwt';
import { handleAchievementTrigger } from '../../utils/achievements';

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[API /achievements] Missing Supabase URL or Service Key');
}

// The admin client is created here on server-side
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Function to get achievements
async function getAchievements() {
  try {
    const { data } = await supabaseAdmin.from('achievements').select('*');
    return data || [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

// Function to get achievement rarity
async function getAchievementRarity(achievementId) {
  try {
    const { count: totalActive } = await supabaseAdmin.from('user_profiles').select('*', { count: 'exact' }).gte('last_login', new Date(Date.now() - 30*24*60*60*1000).toISOString());
    const { count: unlocked } = await supabaseAdmin.from('user_achievements').select('*', { count: 'exact' }).eq('achievement_id', achievementId);
    return totalActive > 0 ? (unlocked / totalActive) * 100 : 0;
  } catch (e) {
    console.error(e);
    return 0;
  }
}

// GET handler for the route
export async function GET(request) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    const verifiedToken = await verifyJwt(token);
    const userId = verifiedToken?.sub;

    if (userId) {
      // Trigger achievements for logged-in user
      await handleAchievementTrigger(userId, 'review_count');
      await handleAchievementTrigger(userId, 'social_links');
      await handleAchievementTrigger(userId, 'referrals');
      await handleAchievementTrigger(userId, 'twitch_status');
      await handleAchievementTrigger(userId, 'twitch_partner');
      await handleAchievementTrigger(userId, 'achievements_unlocked');
      // Add more triggers as needed
    }

    const data = await getAchievements();
    
    let userAchievements = [];
    if (userId) {
      const { data: uaData } = await supabaseAdmin.from('user_achievements').select('achievement_id').eq('user_id', userId);
      userAchievements = uaData || [];
    }
    
    const enrichedData = await Promise.all(data.map(async (a) => ({
      ...a,
      rarity: await getAchievementRarity(a.id),
      is_unlocked: userId ? userAchievements.some(ua => ua.achievement_id === a.id) : false
    })));
    return NextResponse.json(enrichedData);
  } catch (error) {
    console.error('[API /achievements] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 