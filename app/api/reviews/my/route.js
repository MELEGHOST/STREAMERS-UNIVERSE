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
        // Запрашиваем отзывы пользователя, джойним с таблицей streamers для получения display_name
        const { data: reviews, error } = await supabaseAdmin
            .from('reviews')
            .select(`
                *,
                streamer:streamer_id (
                    twitch_user_id,
                    display_name,
                    profile_image_url
                )
            `)
            .eq('author_id', authorId)
            .order('created_at', { ascending: false }); // Сортируем по дате создания (сначала новые)

        if (error) {
            console.error('[API /api/reviews/my] Error fetching reviews:', error);
            return NextResponse.json({ error: 'Failed to fetch reviews', details: error.message }, { status: 500 });
        }

        console.log(`[API /api/reviews/my] Found ${reviews.length} reviews for author ${authorId}.`);

        // Преобразуем данные, чтобы streamer был внутри объекта отзыва
        const formattedReviews = reviews.map(review => ({
            ...review,
            streamer_twitch_id: review.streamer?.twitch_user_id,
            streamer_display_name: review.streamer?.display_name,
            streamer_profile_image_url: review.streamer?.profile_image_url,
            streamer: undefined // Удаляем вложенный объект streamer
        }));

        return NextResponse.json(formattedReviews, { status: 200 });

    } catch (e) {
        console.error('[API /api/reviews/my] Unexpected server error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic'; 