import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '../../../utils/prisma';

export async function POST(request) {
  try {
    // Получаем данные из запроса
    const { followerId, assignerId, role } = await request.json();
    
    if (!followerId || !assignerId) {
      return NextResponse.json({ 
        error: 'Требуются ID последователя и назначающего роль',
        success: false
      }, { status: 400 });
    }
    
    // Проверяем, что пользователь авторизован
    const cookieStore = cookies();
    const userId = cookieStore.get('user_id')?.value;
    
    if (!userId || userId !== assignerId) {
      console.error('Неавторизованный запрос на изменение роли');
      return NextResponse.json({ 
        error: 'Не авторизован для изменения роли',
        success: false
      }, { status: 401 });
    }
    
    // Проверяем, что пользователь действительно подписан на assignerId
    const follow = await prisma.follow.findFirst({
      where: {
        followerId: followerId,
        followedId: assignerId
      }
    });
    
    if (!follow) {
      return NextResponse.json({ 
        error: 'Пользователь не является последователем',
        success: false
      }, { status: 404 });
    }
    
    // Если роль пустая, удаляем существующую роль
    if (!role || role === '') {
      await prisma.userRole.deleteMany({
        where: {
          userId: followerId,
          assignerId: assignerId
        }
      });
      
      return NextResponse.json({
        success: true,
        message: 'Роль успешно удалена'
      });
    }
    
    // Проверяем допустимость роли
    const validRoles = ['moderator', 'vip', 'regular'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ 
        error: 'Недопустимая роль',
        success: false
      }, { status: 400 });
    }
    
    // Обновляем или создаем роль
    const updatedRole = await prisma.userRole.upsert({
      where: {
        userId_assignerId: {
          userId: followerId,
          assignerId: assignerId
        }
      },
      create: {
        userId: followerId,
        assignerId: assignerId,
        roleName: role
      },
      update: {
        roleName: role
      }
    });
    
    return NextResponse.json({
      success: true,
      role: updatedRole.roleName
    });
  } catch (error) {
    console.error('Ошибка при обновлении роли:', error);
    
    return NextResponse.json({
      error: 'Ошибка при обновлении роли',
      success: false
    }, { status: 500 });
  }
} 