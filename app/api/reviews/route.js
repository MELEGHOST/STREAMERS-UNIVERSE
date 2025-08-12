import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJwt } from '../../utils/jwt'; // <<< Путь к app/utils/jwt

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[API /reviews] Critical Error: Supabase URL or Service Key is missing!");
    return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
  }
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("[API /reviews] Critical Error: Supabase URL or Service Key is missing!");
        return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
    const token = request.headers.get('Authorization')?.split(' ')[1];
    const verifiedToken = await verifyJwt(token);

    if (!verifiedToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = verifiedToken.sub;

    try {
        const body = await request.json();
        // <<< Извлекаем все нужные поля, включая genres и age_rating >>>
        const { 
            category, 
            item_name, // Используем item_name, который приходит с фронта 
            rating, 
            text, // Используем text
            image_url, 
            genres, 
            age_rating, 
            subcategory // Добавляем subcategory 
        } = body;

        // Простая валидация
        if (!category || !item_name || !rating || !text) { // Проверяем text
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        if (typeof rating !== 'number' || rating < 1 || rating > 5) {
             return NextResponse.json({ error: 'Invalid rating value' }, { status: 400 });
        }
        // Проверка: если фильмы/сериалы, нужны жанры
        if ((category === 'Фильмы' || category === 'Сериалы') && (!genres || !Array.isArray(genres) || genres.length === 0)) {
            return NextResponse.json({ error: 'Genres are required for Movies/Series' }, { status: 400 });
        }
        // Проверка: если НЕ фильмы/сериалы, нужна подкатегория
        if (!(category === 'Фильмы' || category === 'Сериалы') && !subcategory) {
             return NextResponse.json({ error: 'Subcategory is required for this category' }, { status: 400 });
        }

        console.log(`[API /api/reviews] Creating manual review by ${userId} for item: ${item_name}`);

        // Отзывы всегда одобрены
        const reviewStatus = 'approved';
        console.log(`[API /api/reviews] Manual review status set to: ${reviewStatus}`);

        // --- Сохраняем основной отзыв --- 
        const { data: reviewData, error: insertError } = await supabaseAdmin
            .from('reviews')
            .insert({
                user_id: userId,
                category,
                item_name, // Сохраняем item_name
                rating,
                review_text: text, // Сохраняем text
                image_url: image_url || null,
                status: reviewStatus, 
                genres: (category === 'Фильмы' || category === 'Сериалы') ? genres : null, // Сохраняем массив жанров
                age_rating: age_rating || null, // Сохраняем возрастной рейтинг
                subcategory: (category !== 'Фильмы' && category !== 'Сериалы') ? subcategory : null // Сохраняем подкатегорию
            })
            .select('id, status')
            .single();

        if (insertError) {
            console.error('Error inserting review:', insertError);
            if (insertError.message.includes('rating') && insertError.message.includes('does not exist')) {
                 return NextResponse.json({ error: 'Database error: rating column missing.' }, { status: 500 });
            }
            return NextResponse.json({ error: 'Failed to create review', details: insertError.message }, { status: 500 });
        }

        console.log(`[API /api/reviews] Manual review created by ${userId} with ID: ${reviewData.id}, Status: ${reviewData.status}`);
        const message = 'Review created and published successfully.';

        // TODO: Триггерить ачивки за количество отзывов по cron/воркеру

        return NextResponse.json({ id: reviewData.id, status: reviewData.status, message }, { status: 201 });

    } catch (error) {
        console.error('Error processing POST /api/reviews:', error);
         // Проверяем ошибку парсинга JSON
         if (error instanceof SyntaxError && error.message.includes('JSON')) {
             return NextResponse.json({ error: 'Invalid JSON format in request body' }, { status: 400 });
         } 
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
} 