import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJwt } from '../../utils/jwt'; // Проверь путь!

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Используем SERVICE KEY для чтения/записи достижений пользователей
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[API /api/achievements] Critical Error: Supabase keys missing!");
}

// Создаем админский клиент Supabase
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request) {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    const verifiedToken = await verifyJwt(token);

    if (!verifiedToken) {
        // Если токена нет, просто возвращаем список ВСЕХ достижений
        try {
            console.log("[API /achievements] Fetching all achievements (unauthenticated)...");
            const { data: allAchievements, error: allError } = await supabaseAdmin
                .from('achievements')
                .select('id, name, description, icon, condition_description, is_enabled')
                .eq('is_enabled', true)
                .order('created_at', { ascending: true });

            if (allError) throw allError;

            return NextResponse.json({ all_achievements: allAchievements }, { status: 200 });

        } catch (error) {
            console.error("[API /achievements] Error fetching all achievements:", error);
            return NextResponse.json({ error: error.message || 'Failed to fetch achievements' }, { status: 500 });
        }
    }

    // Если пользователь авторизован, получаем его ID и его достижения
    const userId = verifiedToken.sub;

    try {
        console.log(`[API /achievements] Fetching achievements for user: ${userId}`);
        // Запрос 1: Все доступные достижения
        const { data: allAchievements, error: allError } = await supabaseAdmin
            .from('achievements')
            .select('id, name, description, icon, condition_description, trigger_type, trigger_value, trigger_string') // Берем все нужные поля
            .eq('is_enabled', true)
            .order('created_at', { ascending: true });

        if (allError) throw new Error(`Failed to fetch all achievements: ${allError.message}`);

        // Запрос 2: Достижения текущего пользователя
        const { data: userAchievementsData, error: userError } = await supabaseAdmin
            .from('user_achievements')
            .select('achievement_id, unlocked_at, current_progress')
            .eq('user_id', userId);

        if (userError) throw new Error(`Failed to fetch user achievements: ${userError.message}`);

        // Преобразуем данные пользователя в удобный формат для поиска (Map)
        const userProgressMap = new Map();
        userAchievementsData.forEach(ua => {
            userProgressMap.set(ua.achievement_id, {
                unlocked_at: ua.unlocked_at,
                current_progress: ua.current_progress
            });
        });

        // Собираем финальный результат, добавляя статус и прогресс к каждому достижению
        const resultAchievements = allAchievements.map(ach => {
            const userProgress = userProgressMap.get(ach.id);
            return {
                ...ach,
                is_unlocked: !!userProgress?.unlocked_at,
                unlocked_at: userProgress?.unlocked_at || null,
                current_progress: userProgress?.current_progress || 0,
            };
        });

        return NextResponse.json({ achievements: resultAchievements }, { status: 200 });

    } catch (error) {
        console.error(`[API /achievements] Error fetching achievements for user ${userId}:`, error);
        return NextResponse.json({ error: error.message || 'Failed to fetch achievements' }, { status: 500 });
    }
} 