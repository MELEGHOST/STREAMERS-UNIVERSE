import { NextResponse } from 'next/server';
import { prisma } from '../../../utils/prisma';

export async function POST(request) {
  try {
    // Получаем список Twitch ID из запроса
    const { twitchIds } = await request.json();
    
    if (!twitchIds || !Array.isArray(twitchIds) || twitchIds.length === 0) {
      return NextResponse.json({
        error: 'Требуется массив Twitch ID пользователей',
        registeredIds: [],
        userTypes: {}
      }, { status: 400 });
    }
    
    // Максимальное количество ID для одного запроса
    const maxIds = 100;
    
    if (twitchIds.length > maxIds) {
      console.warn(`Запрос содержит слишком много ID (${twitchIds.length}). Ограничение: ${maxIds}.`);
    }
    
    // Получаем только первые maxIds элементов
    const limitedIds = twitchIds.slice(0, maxIds);
    
    // Запрашиваем данные из базы
    const registeredUsers = await prisma.user.findMany({
      where: {
        twitchId: {
          in: limitedIds
        }
      },
      select: {
        id: true,
        twitchId: true,
        username: true,
        userType: true
      }
    });
    
    // Формируем список ID зарегистрированных пользователей
    const registeredIds = registeredUsers.map(user => user.twitchId);
    
    // Формируем объект с типами пользователей
    const userTypes = {};
    registeredUsers.forEach(user => {
      if (user.twitchId) {
        userTypes[user.twitchId] = user.userType || 'viewer';
      }
    });
    
    // Возвращаем результат
    return NextResponse.json({
      registeredIds,
      userTypes
    });
  } catch (error) {
    console.error('Ошибка при проверке регистрации пользователей:', error);
    
    return NextResponse.json({
      error: 'Ошибка при проверке регистрации пользователей',
      registeredIds: [],
      userTypes: {}
    }, { status: 500 });
  }
} 