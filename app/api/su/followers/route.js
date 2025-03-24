import { NextResponse } from 'next/server';
import { supabaseClient } from '../../../utils/supabaseClient';

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
    
    // Получаем пользователя из базы данных используя Supabase
    const { data: user, error: userError } = await supabaseClient
      .from('users')
      .select('id')
      .eq('twitchId', userId)
      .single();
    
    if (userError || !user) {
      console.error('Ошибка при поиске пользователя:', userError);
      return NextResponse.json({ 
        error: 'Пользователь не найден',
        total: 0,
        followers: []
      }, { status: 404 });
    }
    
    // Получаем всех последователей пользователя
    const { data: follows, error: followsError } = await supabaseClient
      .from('follows')
      .select(`
        *,
        follower:users!follower_id(
          id, username, displayName, profileImage, twitchId, userType, createdAt
        )
      `)
      .eq('followed_id', user.id)
      .order('created_at', { ascending: false });
    
    if (followsError) {
      console.error('Ошибка при получении последователей:', followsError);
      throw followsError;
    }
    
    // Получаем роли последователей
    const { data: followerRoles, error: rolesError } = await supabaseClient
      .from('userRoles')
      .select('*')
      .eq('assignerId', user.id)
      .in('userId', follows.map(f => f.follower_id));
    
    if (rolesError) {
      console.error('Ошибка при получении ролей:', rolesError);
      throw rolesError;
    }
    
    // Преобразуем данные в нужный формат
    const formattedFollowers = follows.map(follow => {
      // Находим роль пользователя
      const role = followerRoles.find(r => r.userId === follow.follower_id);
      const follower = follow.follower;
      
      return {
        id: follower.id,
        suId: follower.id,
        twitchId: follower.twitchId,
        name: follower.displayName || follower.username,
        username: follower.username,
        followedAt: follow.created_at,
        profileImageUrl: follower.profileImage || '/images/default-avatar.png',
        userType: follower.userType || 'viewer',
        role: role?.roleName || null
      };
    });
    
    return NextResponse.json({
      total: follows.length,
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