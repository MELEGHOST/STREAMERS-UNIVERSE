import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJwt } from '../../../../utils/jwt'; // Убедись, что путь правильный
import { handleAchievementTrigger } from '../../../../utils/achievements'; // <<< Импортируем

export async function PUT(request) {
    const token = request.headers.get('Authorization')?.split(' ')[1]; // Получаем JWT

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    let userId;
    try {
        const verifiedToken = await verifyJwt(token);
        if (!verifiedToken || !verifiedToken.sub) {
            throw new Error('Invalid token payload');
        }
        userId = verifiedToken.sub; // ID пользователя из токена
        console.log(`[API /twitch/user/profile] User ID from token: ${userId}`);
    } catch (error) {
        console.error('[API /twitch/user/profile] Token verification failed:', error);
        return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("[API /twitch/user/profile] Critical Error: Supabase URL or Service Key is missing!");
        return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

    const body = await request.json();
    const { birthday, description, social_links, profile_widget } = body;

    const dataToUpdate = {
        updated_at: new Date().toISOString(),
    };
    if (birthday !== undefined) dataToUpdate.birthday = birthday;
    if (description !== undefined) dataToUpdate.description = description;
    if (social_links !== undefined) dataToUpdate.social_links = social_links;
    if (profile_widget !== undefined) dataToUpdate.profile_widget = profile_widget;

    if (Object.keys(dataToUpdate).length === 1) {
        return NextResponse.json({ message: 'No update needed' }, { status: 200 });
    }

    console.log(`[API /twitch/user/profile] Updating profile for user ${userId} with data:`, dataToUpdate);

    try {
        // 2. Обновляем или создаем профиль в нашей базе
        // Мы используем upsert, чтобы создать профиль, если его нет, или обновить, если есть.
        const { data, error } = await supabaseAdmin
            .from('user_profiles')
            .update(dataToUpdate)
            .eq('id', userId)
            .select() // Возвращаем обновленную запись

        if (error) {
            console.error(`[API /twitch/user/profile] Error updating profile:`, error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }

        // --- Запускаем проверку достижений ---
        await handleAchievementTrigger(userId, 'social_links');
        // ------------------------------------

        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error(`[API /twitch/user/profile] Error updating profile:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}