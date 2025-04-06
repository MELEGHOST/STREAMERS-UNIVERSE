import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJwt } from 'utils/jwt';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[API /api/admin/reviews/moderate POST] Critical Error: Supabase keys missing!");
}
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

// Функция проверки роли админа (дублируем или импортируем)
async function isAdmin(userId) {
    if (!userId) return false;
    try {
        const { data, error } = await supabaseAdmin
            .from('user_profiles') 
            .select('role')
            .eq('user_id', userId)
            .single();
        if (error || !data) return false;
        return data.role === 'admin'; 
    } catch (e) { return false; }
}

// POST - Одобрение или отклонение отзыва
export async function POST(request) {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    const verifiedToken = await verifyJwt(token);

    if (!verifiedToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = verifiedToken.sub;

    // Проверяем, является ли пользователь админом
    const userIsAdmin = await isAdmin(userId);
    if (!userIsAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { reviewId, newStatus } = body;

        // Валидация входных данных
        if (!reviewId || !newStatus || !['approved', 'rejected'].includes(newStatus)) {
            return NextResponse.json({ error: "Missing or invalid required fields (reviewId: uuid, newStatus: 'approved' | 'rejected')" }, { status: 400 });
        }

        console.log(`[API /moderate] Admin ${userId} attempting to set status ${newStatus} for review ${reviewId}...`);

        // Обновляем статус только если текущий статус 'pending'
        const { data, error } = await supabaseAdmin
            .from('reviews')
            .update({ status: newStatus })
            .eq('id', reviewId)
            .eq('status', 'pending') // Важно: обновляем только ожидающие
            .select(); // Возвращаем обновленную запись

        if (error) throw error;

        if (!data || data.length === 0) {
             console.warn(`[API /moderate] Review ${reviewId} not found or not in pending state.`);
             return NextResponse.json({ error: 'Review not found or already moderated.' }, { status: 404 });
        }

        console.log(`[API /moderate] Review ${reviewId} status updated to ${newStatus} by admin ${userId}.`);
        return NextResponse.json(data[0], { status: 200 }); // Возвращаем обновленный отзыв

    } catch (error) {
        console.error(`[API /moderate] Error moderating review by admin ${userId}:`, error);
        return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
} 