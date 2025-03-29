'use server';

import { NextResponse } from 'next/server';
import { createPool } from '@vercel/postgres';
import { requireAuth, getCurrentUser } from '../../lib/auth';

// Получение данных пользователя
export async function GET(request) {
  try {
    // Проверяем авторизацию
    await requireAuth();
    
    // Получаем ID пользователя
    const user = await getCurrentUser();
    
    if (!user || !user.userId) {
      return NextResponse.json({ error: 'Не удалось получить ID пользователя' }, { status: 500 });
    }
    
    // Получаем тип данных из запроса
    const { searchParams } = new URL(request.url);
    const dataType = searchParams.get('type');
    
    // Если тип данных не указан, возвращаем все данные пользователя
    const pool = createPool();
    
    let query = 'SELECT data_type, data_value FROM user_data WHERE user_id = $1';
    const params = [user.userId];
    
    if (dataType) {
      query += ' AND data_type = $2';
      params.push(dataType);
    }
    
    const result = await pool.query(query, params);
    
    // Формируем данные в удобный объект
    const userData = {};
    result.rows.forEach(row => {
      try {
        userData[row.data_type] = JSON.parse(row.data_value);
      } catch {
        userData[row.data_type] = row.data_value;
      }
    });
    
    return NextResponse.json(userData);
  } catch (error) {
    console.error('Ошибка при получении данных пользователя:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// Сохранение данных пользователя
export async function POST(request) {
  try {
    // Проверяем авторизацию
    await requireAuth();
    
    // Получаем ID пользователя
    const user = await getCurrentUser();
    
    if (!user || !user.userId) {
      return NextResponse.json({ error: 'Не удалось получить ID пользователя' }, { status: 500 });
    }
    
    // Получаем данные из запроса
    const body = await request.json();
    const { dataType, dataValue } = body;
    
    if (!dataType || dataValue === undefined) {
      return NextResponse.json({ error: 'Отсутствуют обязательные поля' }, { status: 400 });
    }
    
    // Устанавливаем соединение с базой данных
    const pool = createPool();
    
    // Проверяем, существует ли запись
    const checkResult = await pool.query(
      'SELECT 1 FROM user_data WHERE user_id = $1 AND data_type = $2',
      [user.userId, dataType]
    );
    
    let dataValueStr;
    
    // Преобразуем значение в строку JSON, если оно не строка
    if (typeof dataValue === 'string') {
      dataValueStr = dataValue;
    } else {
      dataValueStr = JSON.stringify(dataValue);
    }
    
    if (checkResult.rowCount > 0) {
      // Обновляем существующую запись
      await pool.query(
        'UPDATE user_data SET data_value = $1, updated_at = NOW() WHERE user_id = $2 AND data_type = $3',
        [dataValueStr, user.userId, dataType]
      );
    } else {
      // Создаем новую запись
      await pool.query(
        'INSERT INTO user_data (user_id, data_type, data_value) VALUES ($1, $2, $3)',
        [user.userId, dataType, dataValueStr]
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка при сохранении данных пользователя:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
} 