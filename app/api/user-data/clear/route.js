'use server';

import { NextResponse } from 'next/server';
import { createPool } from '@vercel/postgres';
import { requireAuth, getCurrentUser } from '@/app/lib/auth';

// Очистка всех данных пользователя
export async function POST(request) {
  try {
    // Проверяем авторизацию
    await requireAuth();
    
    // Получаем ID пользователя из JWT токена (предполагается, что requireAuth его проверяет)
    const user = await getCurrentUser(); // Необходимо импортировать getCurrentUser
    
    if (!user || !user.userId) { // Убедитесь, что getCurrentUser возвращает объект с userId
      return NextResponse.json({ error: 'Не удалось получить ID пользователя' }, { status: 500 });
    }
    
    // Устанавливаем соединение с базой данных
    const pool = createPool();
    
    // Удаляем все записи пользователя
    await pool.query(
      'DELETE FROM user_data WHERE user_id = $1',
      [user.userId]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка при очистке данных пользователя:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
} 