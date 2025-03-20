// Этот файл сохранен для обратной совместимости с существующим кодом.
// Он реэкспортирует клиент Supabase вместо Prisma

import supabase from './supabase';

// Экспортируем supabase как prisma для обратной совместимости
const prisma = supabase;

export default prisma; 