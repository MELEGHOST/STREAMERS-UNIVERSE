'use server';

import { NextResponse } from 'next/server';
import { createPool } from '@vercel/postgres';
import { requireAuth, getCurrentUser } from '@/app/lib/auth';

// Экспорт всех данных пользователя
export async function GET(request) {
  try {
    // Проверяем авторизацию
    await requireAuth();
    
    // Получаем ID пользователя
    const user = await getCurrentUser();
    
    if (!user || !user.userId) {
      return NextResponse.json({ error: 'Не удалось получить ID пользователя' }, { status: 500 });
    }
    
    // Устанавливаем соединение с базой данных
    const pool = createPool();
    
    // Получаем все данные пользователя
    const result = await pool.query(
      'SELECT data_type, data_value, created_at, updated_at FROM user_data WHERE user_id = $1',
      [user.userId]
    );
    
    // Формируем данные в удобный объект
    const userData = {};
    result.rows.forEach(row => {
      try {
        userData[row.data_type] = {
          value: JSON.parse(row.data_value),
          created_at: row.created_at,
          updated_at: row.updated_at
        };
      } catch {
        userData[row.data_type] = {
          value: row.data_value,
          created_at: row.created_at,
          updated_at: row.updated_at
        };
      }
    });
    
    return NextResponse.json({
      userId: user.userId,
      exportDate: new Date().toISOString(),
      data: userData
    });
  } catch (error) {
    console.error('Ошибка при экспорте данных пользователя:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
} 