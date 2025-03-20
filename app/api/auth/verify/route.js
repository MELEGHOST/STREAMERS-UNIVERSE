import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Получаем токен из заголовка Authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Отсутствует токен авторизации' 
      }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    // Прямая проверка токена через Twitch API
    try {
      const twitchResponse = await fetch('https://id.twitch.tv/oauth2/validate', {
        method: 'GET',
        headers: {
          'Authorization': `OAuth ${token}`
        }
      });

      if (!twitchResponse.ok) {
        console.log('Проверка токена Twitch завершилась с ошибкой:', twitchResponse.status);
        return NextResponse.json({ 
          valid: false, 
          error: `Twitch API вернул ошибку: ${twitchResponse.status}` 
        }, { status: 401 });
      }
      
      // Токен действителен в Twitch
      try {
        const twitchData = await twitchResponse.json();
        
        // Получаем данные пользователя из тела запроса
        const requestData = await request.json();
        const userData = requestData.user;
        
        if (!userData || !userData.id) {
          console.log('Отсутствуют данные пользователя в запросе');
          // Возвращаем только данные от Twitch
          return NextResponse.json({ 
            valid: true,
            twitch_data: twitchData,
            error: 'Отсутствуют данные пользователя в запросе'
          });
        }
        
        // Проверяем, совпадает ли id пользователя с данными от Twitch
        if (userData.id && twitchData.user_id && userData.id !== twitchData.user_id) {
          console.log('Несоответствие ID пользователя: запрос =', userData.id, 'Twitch =', twitchData.user_id);
          return NextResponse.json({ 
            valid: false, 
            error: 'Несоответствие ID пользователя'
          }, { status: 401 });
        }
        
        // Всё проверено и действительно
        return NextResponse.json({ 
          valid: true,
          user: userData,
          twitch_data: twitchData
        });
      } catch (jsonError) {
        console.error('Ошибка при обработке JSON от Twitch:', jsonError);
        // Токен действителен, но данные некорректны
        return NextResponse.json({ 
          valid: true,
          error: 'Ошибка при обработке данных ответа Twitch'
        });
      }
    } catch (twitchError) {
      console.error('Ошибка при обращении к Twitch API:', twitchError);
      return NextResponse.json({ 
        valid: false, 
        error: 'Ошибка при проверке токена через Twitch API'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Необработанная ошибка в маршруте проверки токена:', error);
    return NextResponse.json({ 
      valid: false, 
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
} 