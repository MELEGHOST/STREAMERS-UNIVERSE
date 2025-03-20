// Импортируем Supabase клиент
import supabase from '../../lib/supabase';

// Экспортируем supabase вместо mockDb
export const prisma = supabase;