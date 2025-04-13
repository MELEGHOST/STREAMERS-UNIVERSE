import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJwt } from '../../../../utils/jwt'; // Убедись, что путь правильный

// Инициализация Supabase Admin Client (используем сервисный ключ)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[API /api/twitch/user/profile] Critical Error: Supabase URL or Service Key is missing!");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false } // Не сохраняем сессию для админ клиента
});

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
        console.log(`[API /api/twitch/user/profile] User ID from token: ${userId}`);
    } catch (error) {
        console.error('[API /api/twitch/user/profile] Token verification failed:', error);
        return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    let requestData;
    try {
        requestData = await request.json();
        console.log('[API /api/twitch/user/profile] Received data:', requestData);
    } catch (error) {
        console.error('[API /api/twitch/user/profile] Error parsing request body:', error);
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { birthday, description, social_links } = requestData;

    // Подготовка данных для обновления
    // Обновляем только те поля, которые пришли в запросе
    const dataToUpdate = {
        updated_at: new Date().toISOString(),
    };
    if (birthday !== undefined) dataToUpdate.birthday = birthday; // Позволяем установить null, если пришел null
    if (description !== undefined) dataToUpdate.description = description;
    if (social_links !== undefined) dataToUpdate.social_links = social_links; // Должен быть объектом или null

    if (Object.keys(dataToUpdate).length === 1) { // Только updated_at
        console.warn('[API /api/twitch/user/profile] No fields to update provided.');
        // Можно вернуть 200 OK, т.к. технически запрос обработан, но ничего не изменилось
        return NextResponse.json({ message: 'No update needed' }, { status: 200 });
        // Или вернуть ошибку, если считаем это некорректным запросом
        // return NextResponse.json({ error: 'No fields to update provided' }, { status: 400 });
    }


    console.log(`[API /api/twitch/user/profile] Updating profile for user ${userId} with data:`, dataToUpdate);

    try {
        const { data, error } = await supabaseAdmin
            .from('user_profiles')
            .update(dataToUpdate)
            .eq('user_id', userId)
            .select() // Возвращаем обновленную запись
            .single(); // Ожидаем одну запись

        if (error) {
            console.error(`[API /api/twitch/user/profile] Supabase update error for user ${userId}:`, error);
            // Проверяем специфичные ошибки Supabase
             if (error.code === 'PGRST116' && error.message.includes('returned 0 rows')) {
                 // Это странно, профиль должен существовать, если юзер авторизован
                 console.error(`[API /api/twitch/user/profile] Profile not found for user ${userId} during update.`);
                 return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
             }
            return NextResponse.json({ error: `Database update error: ${error.message}` }, { status: 500 });
        }

        if (!data) {
             // Сценарий, когда .single() не вернул ни данных, ни ошибки (маловероятно с .update, но на всякий)
             console.error(`[API /api/twitch/user/profile] Supabase update returned no data and no error for user ${userId}.`);
             return NextResponse.json({ error: 'Failed to update profile, unexpected response from database.' }, { status: 500 });
         }

        console.log(`[API /api/twitch/user/profile] Profile for user ${userId} updated successfully:`, data);
        return NextResponse.json({ message: 'Profile updated successfully', profile: data }, { status: 200 });

    } catch (dbError) {
        // Ловим любые другие ошибки (например, сетевые)
        console.error(`[API /api/twitch/user/profile] Unexpected error during database operation for user ${userId}:`, dbError);
        return NextResponse.json({ error: 'An unexpected error occurred during profile update.' }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic'; 