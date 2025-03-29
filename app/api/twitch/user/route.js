import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    // Получаем токен доступа из cookies
    const cookieStore = cookies();
    const accessTokenCookie = cookieStore.get('twitch_token');
    
    if (!accessTokenCookie) {
      // Если токена нет, пользователь не аутентифицирован
      // Можно вернуть ошибку или пустой объект, в зависимости от логики приложения
      // В данном случае, страница профиля требует аутентификации
      return NextResponse.json({ error: 'Необходима аутентификация' }, { status: 401 });
    }
    
    const accessToken = accessTokenCookie.value;
    
    // Получаем данные пользователя из Twitch API по токену (без ID)
    const twitchResponse = await fetch(`https://api.twitch.tv/helix/users`, { // Изменили URL
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!twitchResponse.ok) {
      // Обработка ошибок Twitch API (например, невалидный токен)
      if (twitchResponse.status === 401) {
         // Попытка обновить токен может быть реализована здесь или на клиенте
        return NextResponse.json({ error: 'Токен доступа недействителен или истек' }, { status: 401 });
      }
      console.error('Ошибка Twitch API при получении пользователя:', twitchResponse.status, await twitchResponse.text());
      return NextResponse.json({ error: 'Ошибка при получении данных пользователя от Twitch' }, { status: twitchResponse.status });
    }
    
    const twitchData = await twitchResponse.json();
    
    if (!twitchData.data || twitchData.data.length === 0) {
       // Это не должно произойти при валидном токене, но на всякий случай проверяем
      console.error('Не удалось получить данные пользователя от Twitch, хотя ответ был 200 OK');
      return NextResponse.json({ error: 'Не удалось найти данные пользователя по токену' }, { status: 404 });
    }
    
    const userData = twitchData.data[0];
    const userId = userData.id; // Получаем ID пользователя из ответа
    
    // Получаем количество фолловеров пользователя
    const followersResponse = await fetch(`https://api.twitch.tv/helix/users/follows?to_id=${userId}`, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    // Инициализируем счетчики на случай ошибки
    userData.follower_count = 0;
    userData.following_count = 0;

    if (followersResponse.ok) {
      const followersData = await followersResponse.json();
      userData.follower_count = followersData.total || 0;
    } else {
       console.warn(`Не удалось получить количество подписчиков для ${userId}: ${followersResponse.status}`);
    }
    
    // Получаем количество фолловингов пользователя
    const followingResponse = await fetch(`https://api.twitch.tv/helix/users/follows?from_id=${userId}`, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (followingResponse.ok) {
      const followingData = await followingResponse.json();
      userData.following_count = followingData.total || 0;
    } else {
       console.warn(`Не удалось получить количество подписок для ${userId}: ${followingResponse.status}`);
    }
    
    return NextResponse.json(userData);
  } catch (error) {
    console.error('Внутренняя ошибка сервера при получении данных пользователя:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
} 