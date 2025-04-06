import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJwt } from 'utils/jwt';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[API /api/admin/reviews GET] Critical Error: Supabase keys missing!");
}
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

// Функция проверки роли админа
async function isAdmin(userId) {
    if (!userId) return false;
    try {
        const { data, error } = await supabaseAdmin
            .from('user_profiles') // Предполагаем, что роль хранится здесь
            .select('role')
            .eq('user_id', userId)
            .single();
        if (error || !data) {
            console.warn(`[isAdmin] Could not get profile or role for user ${userId}:`, error);
            return false;
        }
        return data.role === 'admin'; // Проверяем роль
    } catch (e) {
        console.error(`[isAdmin] Error checking admin role for ${userId}:`, e);
        return false;
    }
}

// GET - Получение отзывов, ожидающих модерации
export async function GET(request) {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    const verifiedToken = await verifyJwt(token);

    if (!verifiedToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = verifiedToken.sub;

    // Проверяем, является ли пользователь админом
    const userIsAdmin = await isAdmin(userId);
    if (!userIsAdmin) {
        console.warn(`[API /api/admin/reviews GET] User ${userId} attempted to access admin route.`);
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        console.log(`[API /api/admin/reviews GET] Fetching pending reviews for admin ${userId}...`);
        const { data, error } = await supabaseAdmin
            .from('reviews')
            .select('*') // Выбираем все поля для модерации
            .eq('status', 'pending') // Только ожидающие
            .order('created_at', { ascending: true }); // Сначала старые

        if (error) throw error;

        console.log(`[API /api/admin/reviews GET] Found ${data?.length ?? 0} pending reviews.`);
        return NextResponse.json(data || [], { status: 200 });

    } catch (error) {
        console.error("[API /api/admin/reviews GET] Error fetching pending reviews:", error);
        return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
} 