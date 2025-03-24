import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseClient } from '../../../utils/supabaseClient';

export async function POST(request) {
  try {
    // Получаем данные из запроса
    const { followerId, roleName } = await request.json();
    
    // Проверка наличия необходимых параметров
    if (!followerId) {
      return NextResponse.json({ error: 'ID пользователя обязателен' }, { status: 400 });
    }
    
    // Получаем текущего пользователя из куки
    const cookieStore = cookies();
    const userCookie = cookieStore.get('twitch_user')?.value;
    
    if (!userCookie) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }
    
    const userData = JSON.parse(userCookie);
    
    // Проверяем существование связи между пользователями
    const { data: follow, error: followError } = await supabaseClient
      .from('follows')
      .select('*')
      .eq('follower_id', followerId)
      .eq('followed_id', userData.id);
    
    if (followError || !follow || follow.length === 0) {
      return NextResponse.json({ 
        error: 'Пользователь не является вашим подписчиком' 
      }, { status: 404 });
    }
    
    // Если роль отсутствует, удаляем все роли этого пользователя
    if (!roleName) {
      const { error: deleteError } = await supabaseClient
        .from('userRoles')
        .delete()
        .eq('userId', followerId)
        .eq('assignerId', userData.id);
      
      if (deleteError) {
        console.error('Ошибка при удалении роли:', deleteError);
        return NextResponse.json({ 
          error: 'Не удалось удалить роль пользователя' 
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Роль успешно удалена' 
      });
    }
    
    // Обновляем или создаем роль
    const { data: existingRole, error: roleError } = await supabaseClient
      .from('userRoles')
      .select('*')
      .eq('userId', followerId)
      .eq('assignerId', userData.id)
      .single();
    
    if (existingRole) {
      // Обновляем существующую роль
      const { data: updatedRole, error: updateError } = await supabaseClient
        .from('userRoles')
        .update({ roleName })
        .eq('id', existingRole.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Ошибка при обновлении роли:', updateError);
        return NextResponse.json({ 
          error: 'Не удалось обновить роль пользователя' 
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        success: true, 
        role: updatedRole,
        message: 'Роль успешно обновлена'
      });
    } else {
      // Создаем новую роль
      const { data: newRole, error: createError } = await supabaseClient
        .from('userRoles')
        .insert({
          userId: followerId,
          assignerId: userData.id,
          roleName
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Ошибка при создании роли:', createError);
        return NextResponse.json({ 
          error: 'Не удалось создать роль пользователя' 
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        success: true, 
        role: newRole,
        message: 'Роль успешно назначена'
      });
    }
  } catch (error) {
    console.error('Ошибка при обновлении роли:', error);
    return NextResponse.json({ 
      error: 'Произошла ошибка при обработке запроса' 
    }, { status: 500 });
  }
} 