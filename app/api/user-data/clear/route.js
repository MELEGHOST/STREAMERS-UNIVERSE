'use server';

import { NextResponse } from 'next/server';
import { createPool } from '@vercel/postgres';
import { authenticateUser } from '../../../utils/auth';

// Очистка всех данных пользователя
export async function POST(request) {
  try {
    // Получаем текущего пользователя
    const user = await authenticateUser(request);
    
    if (!user || !user.userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
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