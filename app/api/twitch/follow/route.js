import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    // Получаем данные запроса
    const { targetUserId, action } = await request.json();
    
    if (!targetUserId || !action) {
      return NextResponse.json({ error: 'Отсутствуют необходимые параметры' }, { status: 400 });
    }
    
    // Получаем токен доступа из cookies
    const cookieStore = cookies();
    const accessToken = cookieStore.get('twitch_access_token')?.value;
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }
    
    // Получаем ID текущего пользователя из cookie
    let currentUserId = null;
    let currentUserData = null;
    try {
      const currentUserCookie = cookieStore.get('twitch_user')?.value;
      if (currentUserCookie) {
        currentUserData = JSON.parse(currentUserCookie);
        currentUserId = currentUserData?.id;
      }
    } catch (error) {
      console.error('Ошибка при получении ID пользователя:', error);
      return NextResponse.json({ error: 'Ошибка авторизации' }, { status: 401 });
    }
    
    if (!currentUserId) {
      return NextResponse.json({ error: 'Не удалось определить ID пользователя' }, { status: 401 });
    }
    
    // Проверяем, что пользователь не пытается подписаться на самого себя
    if (currentUserId === targetUserId) {
      return NextResponse.json({ error: 'Нельзя подписаться на самого себя' }, { status: 400 });
    }
    
    // Получаем информацию о целевом пользователе
    let targetUserInfo = null;
    try {
      const response = await fetch(`https://api.twitch.tv/helix/users?id=${targetUserId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-ID': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID
        }
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка при получении информации о пользователе: ${response.status}`);
      }
      
      const userData = await response.json();
      targetUserInfo = userData.data[0];
    } catch (error) {
      console.error('Ошибка при получении информации о пользователе:', error);
      // Продолжаем выполнение даже без информации о пользователе
    }
    
    // Получаем текущий список подписок из базы данных или другого хранилища
    // Здесь упрощённая реализация с использованием localStorage (на клиенте)
    // В реальном приложении здесь будет обращение к базе данных
    
    // Для демонстрации, сохраняем подписку в cookies
    const followKey = `follow_${currentUserId}_${targetUserId}`;
    
    if (action === 'follow') {
      // Устанавливаем cookie с подпиской
      cookieStore.set(followKey, 'true', { 
        path: '/', 
        maxAge: 60 * 60 * 24 * 30, // 30 дней
        httpOnly: true
      });
      
      // Обновляем список подписчиков целевого пользователя
      try {
        // В реальном приложении здесь будет обращение к базе данных
        // Добавляем информацию о подписчике в список последователей целевого пользователя
        const followerData = {
          id: currentUserId,
          login: currentUserData?.login || 'unknown',
          display_name: currentUserData?.display_name || currentUserData?.login || 'Неизвестный пользователь',
          profile_image_url: currentUserData?.profile_image_url || '/default-avatar.png',
          followed_at: new Date().toISOString()
        };
        
        // Здесь бы мы сохранили данные в базе, но в данном случае
        // это будет реализовано на стороне клиента через localStorage
      } catch (error) {
        console.error('Ошибка при обновлении списка последователей:', error);
        // Продолжаем выполнение даже при ошибке обновления списка
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Вы успешно подписались на пользователя',
        userInfo: targetUserInfo
      });
    } else if (action === 'unfollow') {
      // Удаляем cookie с подпиской
      cookieStore.delete(followKey);
      
      // Обновляем список подписчиков целевого пользователя
      try {
        // В реальном приложении здесь будет обращение к базе данных
        // Удаляем информацию о подписчике из списка последователей целевого пользователя
      } catch (error) {
        console.error('Ошибка при обновлении списка последователей:', error);
        // Продолжаем выполнение даже при ошибке обновления списка
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Вы успешно отписались от пользователя' 
      });
    } else {
      return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
    }
  } catch (error) {
    console.error('Ошибка при обработке запроса:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
} 