// Импортируем Supabase клиент
import supabase from '../../lib/supabase';

// Экспортируем supabase вместо mockDb
const prisma = supabase;

export default prisma; 