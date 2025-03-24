import { NextResponse } from 'next/server';
import supabaseClient from '../../../../lib/supabaseClient';
import { verifyToken } from '../../../../lib/auth';

export async function DELETE(request, { params }) {
  try {
    // Получаем ID отзыва из параметров
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ message: 'ID отзыва не указан' }, { status: 400 });
    }
    
    // Проверка авторизации
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Отсутствует токен авторизации' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const userData = await verifyToken(token);
    
    if (!userData || !userData.id) {
      return NextResponse.json({ message: 'Недействительный токен' }, { status: 401 });
    }
    
    // Находим отзыв
    const review = await supabaseClient.from('reviews').select('*').eq('id', id);
    
    if (review.length === 0) {
      return NextResponse.json({ message: 'Отзыв не найден' }, { status: 404 });
    }
    
    // Проверяем, является ли пользователь автором отзыва
    if (review[0].authorId !== userData.id) {
      return NextResponse.json({ message: 'У вас нет прав на удаление этого отзыва' }, { status: 403 });
    }
    
    // Удаляем отзыв
    await supabaseClient.from('reviews').delete().eq('id', id);
    
    // Вычитаем StreamCoins за удаление отзыва
    await supabaseClient.from('users').update({
      streamCoins: supabaseClient.rpc('decrement_coins', { amount: 5 })
    }).eq('id', userData.id);
    
    // Создаем запись о транзакции
    await supabaseClient.from('streamCoinsTransactions').insert({
      userId: userData.id,
      amount: 5,
      type: 'SPEND',
      description: 'Списание за удаление отзыва'
    });
    
    return NextResponse.json({ 
      message: 'Отзыв успешно удален',
      coinsSpent: 5
    });
  } catch (error) {
    console.error('Ошибка при удалении отзыва:', error);
    return NextResponse.json({ message: 'Произошла ошибка при удалении отзыва' }, { status: 500 });
  }
} 