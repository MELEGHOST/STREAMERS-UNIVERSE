import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJwt } from '../../../utils/jwt';

export async function POST(request) {
    console.log('[API /set-referrer] Received POST request');
    const token = request.headers.get('Authorization')?.split(' ')[1];
    const verifiedToken = await verifyJwt(token);

    if (!verifiedToken) {
        console.error('[API /set-referrer] Unauthorized: No valid token');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const currentUserId = verifiedToken.sub; 
    console.log(`[API /set-referrer] Authenticated user ID: ${currentUserId}`);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("[API /set-referrer] Critical Error: Supabase URL or Service Key is missing!");
        return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

    try {
        const body = await request.json();
        const { referrerTwitchId } = body;
        console.log('[API /set-referrer] Request body:', body);

        if (!referrerTwitchId) {
            console.error('[API /set-referrer] Bad Request: Missing referrerTwitchId');
            return NextResponse.json({ error: 'Missing referrerTwitchId in request body' }, { status: 400 });
        }
        
        if (!/^[0-9]+$/.test(referrerTwitchId)) {
             console.error(`[API /set-referrer] Bad Request: Invalid referrerTwitchId format: ${referrerTwitchId}`);
             return NextResponse.json({ error: 'Invalid referrerTwitchId format' }, { status: 400 });
        }

        console.log(`[API /set-referrer] User ${currentUserId} attempting to set referrer Twitch ID to: ${referrerTwitchId}`);

        // 1. Получаем текущий профиль пользователя
        console.log(`[API /set-referrer] Fetching profile for user ${currentUserId}...`);
        const { data: currentProfile, error: fetchError } = await supabaseAdmin
            .from('user_profiles')
            .select('referred_by_twitch_id, twitch_user_id')
            .eq('user_id', currentUserId)
            .maybeSingle();

        if (fetchError) {
            console.error(`[API /set-referrer] Error fetching profile for user ${currentUserId}:`, fetchError);
            return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
        }

        if (!currentProfile) {
             console.error(`[API /set-referrer] Profile not found for user ${currentUserId} in user_profiles table. Cannot set referrer.`);
            return NextResponse.json({ error: 'User profile not found. Cannot set referrer.' }, { status: 404 });
        }
        
        console.log(`[API /set-referrer] Profile fetched for user ${currentUserId}. Current referrer:`, currentProfile.referred_by_twitch_id);

        // Проверяем, не пытается ли пользователь установить себя в качестве реферера
        if (referrerTwitchId === currentProfile.twitch_user_id) {
            console.warn(`[API /set-referrer] User ${currentUserId} attempted to set self as referrer. Aborting.`);
            return NextResponse.json({ error: 'Cannot set self as referrer' }, { status: 400 });
        }
        
        // 2. Проверяем, не установлен ли реферрер уже
        if (currentProfile.referred_by_twitch_id) {
            console.log(`[API /set-referrer] Referrer ID already set for user ${currentUserId}. Skipping update.`);
            return NextResponse.json({ message: 'Referrer already set' }, { status: 200 });
        }

        // 3. Обновляем профиль, устанавливая реферрера
        console.log(`[API /set-referrer] Updating profile for user ${currentUserId} with referrer ${referrerTwitchId}...`);
        const { error: updateError } = await supabaseAdmin
            .from('user_profiles')
            .update({ referred_by_twitch_id: referrerTwitchId })
            .eq('user_id', currentUserId);

        if (updateError) {
            console.error(`[API /set-referrer] Error updating profile for user ${currentUserId}:`, updateError);
            return NextResponse.json({ error: 'Failed to update profile with referrer ID' }, { status: 500 });
        }

        console.log(`[API /set-referrer] Successfully set referrer Twitch ID ${referrerTwitchId} for user ${currentUserId}.`);

        const { data: referrerProfile } = await supabaseAdmin.from('user_profiles').select('user_id').eq('twitch_user_id', referrerTwitchId).single();
        if (!referrerProfile) {
            // Эта проверка на случай, если реферер удалил свой профиль между проверкой и этим моментом.
            console.warn(`[API /set-referrer] Referrer profile with Twitch ID ${referrerTwitchId} disappeared.`);
            return NextResponse.json({ message: 'Referrer not found, but ID was set.' }, { status: 200 });
        }

        const referrerUserId = referrerProfile.user_id;
        
        console.log(`[API /set-referrer] Triggering achievement for user ${referrerUserId} for 'referrals' achievement.`);
        await handleAchievementTrigger(supabaseAdmin, referrerUserId, 'referrals');

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