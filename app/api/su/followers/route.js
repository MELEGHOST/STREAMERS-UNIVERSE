import { NextResponse } from 'next/server';
import { prisma } from '../../../utils/prisma';

export async function GET(request) {
  try {
    // Получаем ID пользователя из запроса
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'Требуется ID пользователя',
        total: 0,
        followers: []
      }, { status: 400 });
    }
    
    // Получаем пользователя из базы данных
    const user = await prisma.user.findUnique({
      where: {
        twitchId: userId
      },
      select: {
        id: true
      }
    });
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Пользователь не найден',
        total: 0,
        followers: []
      }, { status: 404 });
    }
    
    // Получаем всех последователей пользователя
    const followers = await prisma.follow.findMany({
      where: {
        followedId: user.id
      },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            displayName: true,
            profileImage: true,
            twitchId: true,
            userType: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Получаем роли последователей
    const followerRoles = await prisma.userRole.findMany({
      where: {
        assignerId: user.id,
        userId: {
          in: followers.map(f => f.followerId)
        }
      }
    });
    
    // Преобразуем данные в нужный формат
    const formattedFollowers = followers.map(follow => {
      // Находим роль пользователя
      const role = followerRoles.find(r => r.userId === follow.followerId);
      
      return {
        id: follow.follower.id,
        suId: follow.follower.id,
        twitchId: follow.follower.twitchId,
        name: follow.follower.displayName || follow.follower.username,
        username: follow.follower.username,
        followedAt: follow.createdAt.toISOString(),
        profileImageUrl: follow.follower.profileImage || '/images/default-avatar.png',
        userType: follow.follower.userType || 'viewer',
        role: role?.roleName || null
      };
    });
    
    return NextResponse.json({
      total: followers.length,
      followers: formattedFollowers
    });
  } catch (error) {
    console.error('Ошибка при получении последователей:', error);
    
    return NextResponse.json({
      error: 'Ошибка при получении последователей',
      total: 0,
      followers: []
    }, { status: 500 });
  }
} 