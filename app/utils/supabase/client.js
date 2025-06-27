import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Эта ошибка возникнет во время сборки, если ключи не установлены,
  // что лучше, чем ошибка во время выполнения.
  throw new Error('КРИТИЧЕСКАЯ ОШИБКА: Отсутствуют переменные окружения NEXT_PUBLIC_SUPABASE_URL или NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// Создаем и экспортируем единственный экземпляр клиента
export const supabase = createClient(supabaseUrl, supabaseAnonKey) 