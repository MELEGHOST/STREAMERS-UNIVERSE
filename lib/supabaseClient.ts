// Клиент Supabase для использования в API и компонентах
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Получение переменных окружения
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Проверка наличия обязательных переменных окружения
const isSupabaseConfigured = !!(supabaseUrl && supabaseKey);

// Создание типизированного клиента
let supabase: SupabaseClient;

if (isSupabaseConfigured) {
  // Создаем реальный клиент, если все переменные окружения заданы
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  });
} else {
  // Создаем заглушку для случаев, когда переменные окружения не заданы
  console.error('Supabase environment variables are missing');
  
  // Создаем минимальную заглушку с необходимыми методами
  supabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
        }),
        single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
        })
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
          })
        })
      })
    }),
    auth: {
      signIn: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: null, unsubscribe: () => {} })
    },
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        getPublicUrl: () => ({ data: null })
      })
    },
    rpc: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
  } as unknown as SupabaseClient;
}

export default supabase; 