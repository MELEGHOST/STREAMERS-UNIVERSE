import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Временное хранилище подписок (в реальном приложении будет база данных)
let subscriptions = [];

// Получение всех подписок пользователя
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type') || 'subscribers'; // 'subscribers' или 'subscriptions'
    
    if (!userId) {
      return NextResponse.json({ error: 'Не указан ID пользователя' }, { status: 400 });
    }
    
    // Получаем подписки из localStorage или временного хранилища
    let userSubscriptions = [];
    
    if (type === 'subscribers') {
      // Получаем подписчиков (те, кто подписан на пользователя)
      userSubscriptions = subscriptions.filter(sub => sub.targetUserId === userId);
    } else {
      // Получаем подписки пользователя (на кого подписан пользователь)
      userSubscriptions = subscriptions.filter(sub => sub.subscriberId === userId);
    }
    
    return NextResponse.json({ 
      success: true, 
      subscriptions: userSubscriptions 
    });
  } catch (error) {
    console.error('Ошибка при получении подписок:', error);
    return NextResponse.json({ error: 'Ошибка при получении подписок' }, { status: 500 });
  }
}

// Создание новой подписки
export async function POST(request) {
  try {
    const data = await request.json();
    const { subscriberId, targetUserId } = data;
    
    if (!subscriberId || !targetUserId) {
      return NextResponse.json({ error: 'Не указаны необходимые параметры' }, { status: 400 });
    }
    
    // Проверяем, существует ли уже такая подписка
    const existingSubscription = subscriptions.find(
      sub => sub.subscriberId === subscriberId && sub.targetUserId === targetUserId
    );
    
    if (existingSubscription) {
      return NextResponse.json({ error: 'Подписка уже существует' }, { status: 400 });
    }
    
    // Создаем новую подписку
    const newSubscription = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      subscriberId,
      targetUserId,
      createdAt: new Date().toISOString()
    };
    
    subscriptions.push(newSubscription);
    
    // Сохраняем в localStorage (в реальном приложении будет сохранение в БД)
    try {
      // Получаем текущие подписки из localStorage
      const cookieStore = cookies();
      const storedSubscriptions = cookieStore.get('su_subscriptions');
      let parsedSubscriptions = [];
      
      if (storedSubscriptions) {
        try {
          parsedSubscriptions = JSON.parse(storedSubscriptions.value);
        } catch (e) {
          console.error('Ошибка при парсинге подписок из cookies:', e);
        }
      }
      
      // Добавляем новую подписку
      parsedSubscriptions.push(newSubscription);
      
      // Обновляем подписки в localStorage
      cookieStore.set('su_subscriptions', JSON.stringify(parsedSubscriptions));
    } catch (e) {
      console.error('Ошибка при сохранении подписок в cookies:', e);
    }
    
    return NextResponse.json({ 
      success: true, 
      subscription: newSubscription 
    });
  } catch (error) {
    console.error('Ошибка при создании подписки:', error);
    return NextResponse.json({ error: 'Ошибка при создании подписки' }, { status: 500 });
  }
}

// Удаление подписки
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const subscriberId = searchParams.get('subscriberId');
    const targetUserId = searchParams.get('targetUserId');
    
    if (!subscriberId || !targetUserId) {
      return NextResponse.json({ error: 'Не указаны необходимые параметры' }, { status: 400 });
    }
    
    // Находим индекс подписки для удаления
    const subscriptionIndex = subscriptions.findIndex(
      sub => sub.subscriberId === subscriberId && sub.targetUserId === targetUserId
    );
    
    if (subscriptionIndex === -1) {
      return NextResponse.json({ error: 'Подписка не найдена' }, { status: 404 });
    }
    
    // Удаляем подписку
    subscriptions.splice(subscriptionIndex, 1);
    
    // Обновляем localStorage (в реальном приложении будет обновление в БД)
    try {
      // Получаем текущие подписки из localStorage
      const cookieStore = cookies();
      const storedSubscriptions = cookieStore.get('su_subscriptions');
      let parsedSubscriptions = [];
      
      if (storedSubscriptions) {
        try {
          parsedSubscriptions = JSON.parse(storedSubscriptions.value);
        } catch (e) {
          console.error('Ошибка при парсинге подписок из cookies:', e);
        }
      }
      
      // Удаляем подписку
      const updatedSubscriptions = parsedSubscriptions.filter(
        sub => !(sub.subscriberId === subscriberId && sub.targetUserId === targetUserId)
      );
      
      // Обновляем подписки в localStorage
      cookieStore.set('su_subscriptions', JSON.stringify(updatedSubscriptions));
    } catch (e) {
      console.error('Ошибка при обновлении подписок в cookies:', e);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Подписка успешно удалена' 
    });
  } catch (error) {
    console.error('Ошибка при удалении подписки:', error);
    return NextResponse.json({ error: 'Ошибка при удалении подписки' }, { status: 500 });
  }
} 