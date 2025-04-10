import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../utils/supabase/admin'; // ИСПРАВЛЕННЫЙ ПУТЬ и раскомментировано
import { verifyJwt } from '../../../utils/jwt'; 

// DELETE - Удаление отзыва
export async function DELETE(request, { params }) {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    const verifiedToken = await verifyJwt(token);

    if (!verifiedToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = verifiedToken.sub; // ID пользователя из токена
    const reviewId = params.reviewId; // ID отзыва из URL

    console.log(`[API /api/reviews/${reviewId}] DELETE request received from user ${userId}`);

    if (!reviewId) {
        return NextResponse.json({ error: 'Review ID is required' }, { status: 400 });
    }
    
    // Проверяем, инициализирован ли админский клиент
    if (!supabaseAdmin) {
         console.error(`[API /api/reviews/${reviewId}] Supabase admin client is not initialized! Check environment variables.`);
        return NextResponse.json({ error: 'Server configuration error: Supabase admin client failed to initialize.' }, { status: 500 });
    }

    // --- ВОССТАНОВЛЕННАЯ ЛОГИКА ---
    try {
        // Сначала проверим, существует ли отзыв и принадлежит ли он этому пользователю
        const { data: review, error: findError } = await supabaseAdmin
            .from('reviews')
            .select('id, user_id')
            .eq('id', reviewId)
            .maybeSingle(); 

        if (findError) {
            console.error(`[API /api/reviews/${reviewId}] Error finding review:`, findError);
            return NextResponse.json({ error: 'Failed to check review', details: findError.message }, { status: 500 });
        }

        if (!review) {
            console.warn(`[API /api/reviews/${reviewId}] Review not found for deletion attempt by user ${userId}.`);
            return NextResponse.json({ error: 'Review not found' }, { status: 404 });
        }

        if (review.user_id !== userId) {
            console.warn(`[API /api/reviews/${reviewId}] User ${userId} attempted to delete review belonging to user ${review.user_id}.`);
            return NextResponse.json({ error: 'Forbidden: You can only delete your own reviews' }, { status: 403 });
        }

        // Если всё ок - удаляем отзыв
        const { error: deleteError } = await supabaseAdmin
            .from('reviews')
            .delete()
            .eq('id', reviewId)
            .eq('user_id', userId); 

        if (deleteError) {
            console.error(`[API /api/reviews/${reviewId}] Error deleting review:`, deleteError);
            return NextResponse.json({ error: 'Failed to delete review', details: deleteError.message }, { status: 500 });
        }

        console.log(`[API /api/reviews/${reviewId}] Review successfully deleted by user ${userId}.`);
        return NextResponse.json({ message: 'Review deleted successfully' }, { status: 200 });

    } catch (error) {
        console.error(`[API /api/reviews/${reviewId}] Unexpected error processing DELETE request:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
    // --- КОНЕЦ ВОССТАНОВЛЕННОЙ ЛОГИКИ ---
}

// GET - Получение одного отзыва для редактирования
export async function GET(request, { params }) {
     const token = request.headers.get('Authorization')?.split(' ')[1];
    const verifiedToken = await verifyJwt(token);

    if (!verifiedToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = verifiedToken.sub;
    const reviewId = params.reviewId;

    console.log(`[API /api/reviews/${reviewId}] GET request received from user ${userId}`);

    if (!reviewId) {
        return NextResponse.json({ error: 'Review ID is required' }, { status: 400 });
    }

    // Проверяем, инициализирован ли админский клиент
    if (!supabaseAdmin) {
         console.error(`[API /api/reviews/${reviewId}] Supabase admin client is not initialized! Check environment variables.`);
        return NextResponse.json({ error: 'Server configuration error: Supabase admin client failed to initialize.' }, { status: 500 });
    }
    
    // --- ВОССТАНОВЛЕННАЯ ЛОГИКА ---
    try {
        const { data: review, error: findError } = await supabaseAdmin
            .from('reviews')
            .select('id, user_id, category, item_name, rating, review_text, image_url') 
            .eq('id', reviewId)
            .maybeSingle();

        if (findError) {
            console.error(`[API /api/reviews/${reviewId}] Error fetching review:`, findError);
            return NextResponse.json({ error: 'Failed to fetch review', details: findError.message }, { status: 500 });
        }

        if (!review) {
             console.warn(`[API /api/reviews/${reviewId}] Review not found for GET request by user ${userId}.`);
            return NextResponse.json({ error: 'Review not found' }, { status: 404 });
        }

        if (review.user_id !== userId) {
             console.warn(`[API /api/reviews/${reviewId}] User ${userId} attempted to GET review belonging to user ${review.user_id}.`);
            return NextResponse.json({ error: 'Forbidden: You can only fetch your own reviews for editing' }, { status: 403 });
        }

        console.log(`[API /api/reviews/${reviewId}] Review data successfully fetched for user ${userId}.`);
        return NextResponse.json(review, { status: 200 });

    } catch (error) {
         console.error(`[API /api/reviews/${reviewId}] Unexpected error processing GET request:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
    // --- КОНЕЦ ВОССТАНОВЛЕННОЙ ЛОГИКИ ---
}

// PATCH - Обновление отзыва
export async function PATCH(request, { params }) {
      const token = request.headers.get('Authorization')?.split(' ')[1];
    const verifiedToken = await verifyJwt(token);

    if (!verifiedToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = verifiedToken.sub;
    const reviewId = params.reviewId;

    console.log(`[API /api/reviews/${reviewId}] PATCH request received from user ${userId}`);

    if (!reviewId) {
        return NextResponse.json({ error: 'Review ID is required' }, { status: 400 });
    }

     // Проверяем, инициализирован ли админский клиент
    if (!supabaseAdmin) {
         console.error(`[API /api/reviews/${reviewId}] Supabase admin client is not initialized! Check environment variables.`);
        return NextResponse.json({ error: 'Server configuration error: Supabase admin client failed to initialize.' }, { status: 500 });
    }

    // --- ВОССТАНОВЛЕННАЯ ЛОГИКА ---
    try {
        const body = await request.json();
        const { review_text, rating } = body;

        // Валидация входных данных
        if (!review_text || typeof review_text !== 'string' || review_text.trim() === '') {
             return NextResponse.json({ error: 'Review text cannot be empty' }, { status: 400 });
        }
        if (rating === undefined || typeof rating !== 'number' || rating < 1 || rating > 5) {
            return NextResponse.json({ error: 'Invalid rating value (must be 1-5)' }, { status: 400 });
        }

        const { data: existingReview, error: findError } = await supabaseAdmin
            .from('reviews')
            .select('id, user_id')
            .eq('id', reviewId)
            .maybeSingle();

         if (findError) {
            console.error(`[API /api/reviews/${reviewId}] Error checking review before PATCH:`, findError);
            return NextResponse.json({ error: 'Failed to check review before update', details: findError.message }, { status: 500 });
        }

        if (!existingReview) {
            console.warn(`[API /api/reviews/${reviewId}] Review not found for PATCH attempt by user ${userId}.`);
            return NextResponse.json({ error: 'Review not found' }, { status: 404 });
        }

        if (existingReview.user_id !== userId) {
             console.warn(`[API /api/reviews/${reviewId}] User ${userId} attempted to PATCH review belonging to user ${existingReview.user_id}.`);
            return NextResponse.json({ error: 'Forbidden: You can only update your own reviews' }, { status: 403 });
        }

        // Если всё ок - обновляем отзыв
        const { data: updatedReview, error: updateError } = await supabaseAdmin
            .from('reviews')
            .update({
                review_text: review_text.trim(), 
                rating: rating,
             })
            .eq('id', reviewId)
            .eq('user_id', userId) 
            .select('id, review_text, rating, updated_at') 
            .single();

        if (updateError) {
            console.error(`[API /api/reviews/${reviewId}] Error updating review:`, updateError);
            return NextResponse.json({ error: 'Failed to update review', details: updateError.message }, { status: 500 });
        }

        console.log(`[API /api/reviews/${reviewId}] Review successfully updated by user ${userId}.`);
        return NextResponse.json(updatedReview, { status: 200 });

    } catch (error) {
         // Ловим ошибки парсинга JSON
        if (error instanceof SyntaxError) {
             console.error(`[API /api/reviews/${reviewId}] Invalid JSON in PATCH request:`, error);
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }
        console.error(`[API /api/reviews/${reviewId}] Unexpected error processing PATCH request:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
     // --- КОНЕЦ ВОССТАНОВЛЕННОЙ ЛОГИКИ ---
} 