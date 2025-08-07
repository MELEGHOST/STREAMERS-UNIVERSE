import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(_req, { params }) {
  try {
    const { twitchId } = params || {};
    if (!twitchId || !/^\d+$/.test(twitchId)) {
      return NextResponse.json({ error: 'Invalid twitchId' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[API /reviews/streamer] Supabase config missing');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

    const { data, error } = await supabase
      .from('reviews')
      .select('id, user_id, author_twitch_display_name, review_text, rating, created_at')
      .eq('streamer_twitch_id', twitchId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[API /reviews/streamer] DB error:', error);
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (e) {
    console.error('[API /reviews/streamer] Unexpected:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';


