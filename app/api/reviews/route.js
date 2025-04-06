import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJwt } from '../../utils/jwt.js'; // <<< Указываем расширение .js

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
export async function GET(request) {
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
    const userId = verifiedToken.sub; // Получаем ID пользователя из токена

    try {
        const body = await request.json();
        const { category, itemName, rating, textContent } = body;

        // Валидация входных данных
        if (!category || !itemName || !rating || !textContent || rating < 1 || rating > 5) {
            return NextResponse.json({ error: 'Missing or invalid required fields (category, itemName, rating(1-5), textContent)' }, { status: 400 });
        }

        console.log(`[API /api/reviews] Creating manual review for user ${userId}...`);

        const { data, error } = await supabaseAdmin
            .from('reviews')
            .insert({
                user_id: userId,
                category,
                item_name: itemName,
                rating,
                text_content: textContent,
                status: 'approved' // Ручные сразу одобрены
            })
            .select(); // Возвращаем созданную запись

        if (error) throw error;

        console.log(`[API /api/reviews] Manual review created successfully with ID: ${data?.[0]?.id}`);
        return NextResponse.json(data[0], { status: 201 }); // Возвращаем созданный отзыв

    } catch (error) {
        console.error(`[API /api/reviews] Error creating manual review for user ${userId}:`, error);
         // Обработка специфических ошибок БД (уникальность и т.д.) может быть здесь
        return NextResponse.json({ error: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
} 