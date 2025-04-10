import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJwt } from '../../../utils/jwt';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[API /api/reviews/my] Critical Error: Supabase URL or Service Key is missing!");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
});

export async function GET(request) {
    const token = request.headers.get('Authorization')?.split(' ')[1];

    if (!token) {
        console.warn('[API /api/reviews/my] Unauthorized: No token provided.');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const verifiedToken = await verifyJwt(token);
    if (!verifiedToken) {
        console.warn('[API /api/reviews/my] Unauthorized: Invalid token.');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authorId = verifiedToken.sub; // Получаем Supabase User ID автора из токена
    console.log(`[API /api/reviews/my] Fetching reviews for author_id: ${authorId}`);

    try {
        // Запрашиваем отзывы пользователя
        // Убираем JOIN с streamer_id, т.к. он вызывает ошибку и, возможно, не нужен
        // Если информация об объекте отзыва нужна, ее надо получать иначе (например, по item_name)
        const { data: reviews, error } = await supabaseAdmin
            .from('reviews')
            .select('*') // Выбираем все поля самого отзыва
            // .select(`*, streamer:streamer_id (*)`) // <<< УБИРАЕМ JOIN
            .eq('user_id', authorId) // <<< Ищем по user_id, а не author_id
            .order('created_at', { ascending: false }); 

        if (error) {
            console.error('[API /api/reviews/my] Error fetching reviews:', error);
            // Уточняем сообщение об ошибке, если оно связано с колонкой
            if (error.message.includes('column') && error.message.includes('does not exist')){
                 return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
            }
            return NextResponse.json({ error: 'Failed to fetch reviews', details: error.message }, { status: 500 });
        }

        console.log(`[API /api/reviews/my] Found ${reviews.length} reviews for author ${authorId}.`);

        // Удаляем лишнее форматирование, т.к. JOIN убран
        // const formattedReviews = reviews.map(review => ({ ... }));

        return NextResponse.json(reviews, { status: 200 }); // Возвращаем чистые отзывы

    } catch (e) {
        console.error('[API /api/reviews/my] Unexpected server error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic'; 