import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// --- Вспомогательная функция для проверки роли админа ---
async function isAdmin(token) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[isAdmin] Critical Error: Supabase keys missing!');
    return false;
  }
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  if (!token) return false;

  try {
    // Используем встроенную в Supabase верификацию JWT
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);
    if (userError) {
      console.error(`[isAdmin] Error verifying token:`, userError.message);
      return false;
    }

    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error(
        `[isAdmin] Error fetching profile for ${user.id}:`,
        error.message
      );
      return false;
    }
    return data?.role === 'admin';
  } catch (e) {
    console.error(`[isAdmin] Unexpected error for token:`, e.message);
    return false;
  }
}
// ------------------------------------------------------

// GET - Получение всех отзывов на модерацию (статус 'pending')
export async function GET(request) {
  const token = request.headers.get('Authorization')?.split(' ')[1];
  if (!(await isAdmin(token))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  console.log(`[API Admin Reviews] Fetching pending reviews...`);

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(
        '[API /api/admin/reviews] Critical Error: Supabase keys missing!'
      );
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select(
        `
                id,
                review_text,
                status,
                created_at,
                author_twitch_display_name,
                streamer_display_name
            `
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data || [], { status: 200 });
  } catch (error) {
    console.error(`[API Admin Reviews] Error fetching pending reviews:`, error);
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message}` },
      { status: 500 }
    );
  }
}

// Удаляем старый PATCH, так как логика перенесена в /moderate
/*
// ... (весь старый PATCH метод закомментирован или удален)
*/

export const dynamic = 'force-dynamic';
