import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJwt } from '../../utils/jwt'; // <<< Путь к app/utils/jwt

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[API /api/reviews] Critical Error: Supabase URL or Service Key is missing!");
}
// Используем сервисный ключ для POST запросов, чтобы обойти RLS (если нужно)
// Для GET можно было бы использовать ключ пользователя, если RLS настроена на чтение одобренных
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
});

// GET - Получение одобренных отзывов
export async function GET() {
    // TODO: Добавить пагинацию (limit, offset)
    try {
        console.log("[API /api/reviews] Fetching approved reviews...");
        const { data, error } = await supabaseAdmin // Или обычный клиент, если RLS позволяет
            .from('reviews')
            .select('*') // В идеале нужно выбирать конкретные поля
            .eq('status', 'approved')
            .order('created_at', { ascending: false });

        if (error) throw error;

        console.log(`[API /api/reviews] Found ${data?.length ?? 0} approved reviews.`);
        return NextResponse.json(data || [], { status: 200 });

    } catch (error) {
        console.error("[API /api/reviews] Error fetching reviews:", error);
        return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
}

// POST - Создание нового ручного отзыва
export async function POST(request) {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    const verifiedToken = await verifyJwt(token);

    if (!verifiedToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = verifiedToken.sub;

    try {
        const body = await request.json();
        const { category, subcategory, itemName, rating, reviewText, imageUrl } = body;

        // Простая валидация
        if (!category || !itemName || !rating || !reviewText) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        if (typeof rating !== 'number' || rating < 1 || rating > 5) {
             return NextResponse.json({ error: 'Invalid rating value' }, { status: 400 });
        }

        console.log(`[API /api/reviews] Creating manual review by ${userId} for item: ${itemName}`);

        // --- УБИРАЕМ ПРОВЕРКУ НА СТРИМЕРА - ВСЕ ОТЗЫВЫ ОДОБРЕНЫ --- 
        const reviewStatus = 'approved';
        console.log(`[API /api/reviews] Manual review status set to: ${reviewStatus}`);
        // ---------------------------------------------------------

        const { data, error } = await supabaseAdmin
            .from('reviews')
            .insert({
                user_id: userId,
                category,
                subcategory: subcategory || null,
                item_name: itemName,
                rating,
                review_text: reviewText,
                image_url: imageUrl || null,
                status: reviewStatus // Всегда approved
            })
            .select('id, status')
            .single();

        if (error) {
            console.error('Error inserting review:', error);
            if (error.message.includes('rating') && error.message.includes('does not exist')) {
                 return NextResponse.json({ error: 'Database error: rating column missing.' }, { status: 500 });
            }
            return NextResponse.json({ error: 'Failed to create review', details: error.message }, { status: 500 });
        }

        console.log(`[API /api/reviews] Manual review created by ${userId} with ID: ${data.id}, Status: ${data.status}`);
        const message = 'Review created and published successfully.'; // Сообщение всегда об успехе
        return NextResponse.json({ id: data.id, status: data.status, message }, { status: 201 });

    } catch (error) {
        console.error('Error processing POST /api/reviews:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
} 