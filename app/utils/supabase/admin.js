import { createClient } from '@supabase/supabase-js';

// Важно: Эти переменные должны быть установлены в переменных окружения Vercel
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
  console.error('********* Missing Supabase URL environment variable *********');
  // В реальном приложении здесь лучше выбросить ошибку или вернуть null
  // throw new Error('Missing Supabase URL environment variable');
}
if (!supabaseServiceKey) {
  console.error('********* Missing Supabase Service Key environment variable *********');
  // В реальном приложении здесь лучше выбросить ошибку или вернуть null
  // throw new Error('Missing Supabase Service Key environment variable');
}

// Создаем АДМИНСКИЙ клиент Supabase, который может обходить RLS
// НЕ ИСПОЛЬЗУЙТЕ ЕГО НА КЛИЕНТСКОЙ СТОРОНЕ!
export const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        // Важно отключить авто-обновление токена для service_role ключа
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

if (!supabaseAdmin) {
  console.error('!!!!!!!!!! Supabase admin client initialization failed !!!!!!!!!!');
} 