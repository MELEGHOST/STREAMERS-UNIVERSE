import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[API /api/admin/reviews/moderate POST] Critical Error: Supabase keys missing!");
}
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

// --- Вспомогательная функция для проверки роли админа ---
async function isAdmin(token) {
    if (!token) return false;
    try {
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
        if (userError || !user) {
            console.error(`[isAdmin/moderate] Error verifying token:`, userError?.message);
            return false;
        }

        const { data, error } = await supabaseAdmin
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error(`[isAdmin/moderate] Error fetching profile for ${user.id}:`, error.message);
            return false;
        }
        return data?.role === 'admin';
    } catch (e) {
        console.error(`[isAdmin/moderate] Unexpected error:`, e.message);
        return false;
    }
}

// POST - Одобрение или отклонение отзыва
export async function POST(request) {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    
    if (!(await isAdmin(token))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Получаем ID пользователя из токена для логгирования
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);

    try {
        const body = await request.json();
        // Клиент отправляет 'status', а не 'newStatus'
        const { reviewId, status } = body; 

        // Валидация входных данных
        if (!reviewId || !status || !['approved', 'rejected'].includes(status)) {
            return NextResponse.json({ error: "Missing or invalid required fields (reviewId: uuid, status: 'approved' | 'rejected')" }, { status: 400 });
        }

        console.log(`[API /moderate] Admin ${user.id} attempting to set status ${status} for review ${reviewId}...`);

        // Обновляем статус
        const { data, error } = await supabaseAdmin
            .from('reviews')
            .update({ status: status })
            .eq('id', reviewId)
            .select() // Возвращаем обновленную запись
            .single();

        if (error) throw error;

        if (!data) {
             console.warn(`[API /moderate] Review ${reviewId} not found.`);
             return NextResponse.json({ error: 'Review not found.' }, { status: 404 });
        }

        console.log(`[API /moderate] Review ${reviewId} status updated to ${status} by admin ${user.id}.`);
        return NextResponse.json(data, { status: 200 }); // Возвращаем обновленный отзыв

    } catch (error) {
        console.error(`[API /moderate] Error moderating review by admin ${user.id}:`, error);
        return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
} 