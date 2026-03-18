import { createClient } from '@supabase/supabase-js';

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_bd_SUPABASE_URL;
  const supabaseServiceKey = process.env.bd_SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl) {
    console.error('********* Missing Supabase URL environment variable *********');
    throw new Error('Missing Supabase URL environment variable');
  }
  if (!supabaseServiceKey) {
    console.error('********* Missing Supabase Service Key environment variable *********');
    throw new Error('Missing Supabase Service Key environment variable');
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
} 

