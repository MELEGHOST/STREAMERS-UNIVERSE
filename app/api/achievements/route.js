import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
export async function GET() {
  try {
    const data = await getAchievements();
    const enrichedData = await Promise.all(data.map(async (a) => ({
      ...a,
      rarity: await getAchievementRarity(a.id)
    })));
    return NextResponse.json(enrichedData);
  } catch (error) {
    console.error('[API /achievements] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 