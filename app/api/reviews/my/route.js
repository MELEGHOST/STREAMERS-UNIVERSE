import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJwt } from '../../../utils/jwt';

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
  console.log(
    `[API /api/reviews/my] Fetching reviews for author_id: ${authorId}`
  );

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error(
      '[API /reviews/my] Critical Error: Supabase URL or Service Key is missing!'
    );
    return NextResponse.json(
      { error: 'Supabase configuration missing' },
      { status: 500 }
    );
  }
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    const { data: reviews, error } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('user_id', authorId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json(reviews, { status: 200 });
  } catch (e) {
    console.error('[API /reviews/my] Error:', e);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
