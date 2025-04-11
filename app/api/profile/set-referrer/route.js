import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJwt } from '../../../utils/jwt';

// Инициализация Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[API /api/profile/set-referrer] Critical Error: Supabase URL or Service Key is missing!");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
});

export async function POST(request) {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    const verifiedToken = await verifyJwt(token);

    if (!verifiedToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // ID текущего пользователя, который только что залогинился
    const currentUserId = verifiedToken.sub; 

    try {
        const body = await request.json();
        const { referrerTwitchId } = body;

        if (!referrerTwitchId) {
            return NextResponse.json({ error: 'Missing referrerTwitchId in request body' }, { status: 400 });
        }
        
        // Проверяем, что referrerTwitchId - это числовой ID
        if (!/^[0-9]+$/.test(referrerTwitchId)) {
             return NextResponse.json({ error: 'Invalid referrerTwitchId format' }, { status: 400 });
        }

        console.log(`[API /set-referrer] User ${currentUserId} is setting referrer Twitch ID to: ${referrerTwitchId}`);

        // 1. Получаем текущий профиль пользователя
        const { data: currentProfile, error: fetchError } = await supabaseAdmin
            .from('user_profiles')
            .select('referred_by_twitch_id')
            .eq('user_id', currentUserId)
            .maybeSingle();

        if (fetchError) {
            console.error(`[API /set-referrer] Error fetching profile for user ${currentUserId}:`, fetchError);
            return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
        }

        if (!currentProfile) {
             console.warn(`[API /set-referrer] Profile not found for user ${currentUserId}. Cannot set referrer.`);
            // Возможно, профиль еще не создан? Это странно, если пользователь только что вошел.
            // Можно попробовать создать профиль здесь, но лучше, чтобы он создавался при первом заходе на страницу профиля.
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
        }

        // 2. Проверяем, не установлен ли реферрер уже
        if (currentProfile.referred_by_twitch_id) {
            console.log(`[API /set-referrer] Referrer ID already set for user ${currentUserId} to ${currentProfile.referred_by_twitch_id}. Skipping update.`);
            return NextResponse.json({ message: 'Referrer already set' }, { status: 200 });
        }

        // 3. Обновляем профиль, устанавливая реферрера
        const { error: updateError } = await supabaseAdmin
            .from('user_profiles')
            .update({ referred_by_twitch_id: referrerTwitchId })
            .eq('user_id', currentUserId);

        if (updateError) {
            console.error(`[API /set-referrer] Error updating profile for user ${currentUserId} with referrer ${referrerTwitchId}:`, updateError);
            return NextResponse.json({ error: 'Failed to update profile with referrer ID' }, { status: 500 });
        }

        console.log(`[API /set-referrer] Successfully set referrer Twitch ID ${referrerTwitchId} for user ${currentUserId}.`);
        return NextResponse.json({ message: 'Referrer ID successfully set' }, { status: 200 });

    } catch (error) {
        if (error instanceof SyntaxError) {
             console.error("[API /set-referrer] Failed to parse request JSON:", error);
             return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
        }
        console.error("[API /set-referrer] Unexpected error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
} 