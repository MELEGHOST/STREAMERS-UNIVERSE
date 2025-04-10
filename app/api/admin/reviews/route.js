import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJwt } from '../../../utils/jwt';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[API /api/admin/reviews] Critical Error: Supabase keys missing!");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
});

// --- Вспомогательная функция для проверки роли админа ---
async function isAdmin(token) {
    if (!token) return false;
    const verifiedToken = await verifyJwt(token);
    if (!verifiedToken) return false;
    const userId = verifiedToken.sub;
    
    try {
        const { data, error } = await supabaseAdmin
            .from('user_profiles')
            .select('role')
            .eq('user_id', userId)
            .single();
        if (error) {
            console.error(`[isAdmin] Error fetching profile for ${userId}:`, error);
            return false;
        }
        return data?.role === 'admin';
    } catch (e) {
        console.error(`[isAdmin] Unexpected error for ${userId}:`, e);
        return false;
    }
}
// ------------------------------------------------------

// GET - Получение отзывов по статусу (для админа)
export async function GET(request) {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!(await isAdmin(token))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const status = request.nextUrl.searchParams.get('status');
    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
        return NextResponse.json({ error: 'Invalid or missing status parameter (pending, approved, rejected)' }, { status: 400 });
    }

    console.log(`[API Admin Reviews] Fetching reviews with status: ${status}`);

    try {
        // Джойним с user_profiles, чтобы получить ник автора (если нужно)
        const { data, error } = await supabaseAdmin
            .from('reviews')
            .select(`
                *,
                author:user_id (
                    user_metadata->>name, 
                    user_metadata->>user_name,
                    raw_user_meta_data->>login 
                )
            `)
            .eq('status', status)
            .order('created_at', { ascending: true }); // Сначала старые на модерацию

        if (error) throw error;
        
        // Приводим автора к одному виду
        const formattedData = data.map(r => ({
            ...r,
            author_nickname: r.author?.name || r.author?.user_name || r.author?.login || r.author_twitch_nickname || 'Неизвестно'
        }));

        return NextResponse.json(formattedData || [], { status: 200 });
    } catch (error) {
        console.error(`[API Admin Reviews] Error fetching reviews (status=${status}):`, error);
        return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
}

// PATCH - Обновление статуса отзыва (для админа)
export async function PATCH(request) {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!(await isAdmin(token))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { reviewId, newStatus } = body;

        if (!reviewId || !newStatus || !['approved', 'rejected'].includes(newStatus)) {
            return NextResponse.json({ error: 'Missing or invalid reviewId or newStatus (approved, rejected)' }, { status: 400 });
        }

        console.log(`[API Admin Reviews] Updating review ${reviewId} to status: ${newStatus}`);

        const { data, error } = await supabaseAdmin
            .from('reviews')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', reviewId)
            .select('id, status') // Возвращаем обновленные данные
            .single();

        if (error) {
            if (error.code === 'PGRST116') { // Not found
                return NextResponse.json({ error: `Review with ID ${reviewId} not found.` }, { status: 404 });
            }
            throw error;
        }
        
        if (!data) { // На всякий случай, если single() вернул null без ошибки
             return NextResponse.json({ error: `Review with ID ${reviewId} not found after update attempt.` }, { status: 404 });
        }

        console.log(`[API Admin Reviews] Review ${data.id} status updated to ${data.status}`);
        return NextResponse.json(data, { status: 200 });

    } catch (error) {
        console.error('[API Admin Reviews] Error updating review status:', error);
        return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic'; 