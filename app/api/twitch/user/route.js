import { NextResponse } from 'next/server';
import { cookies } from 'next/headers'; // Нужен для работы с кэшем в куках

// --- Функция для получения токена приложения Twitch ---
async function getTwitchAppAccessToken() {
  console.log('[API /twitch/user] Запрос НОВОГО токена приложения Twitch...');
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId) {
    console.error('[API /twitch/user] ОШИБКА: Отсутствует TWITCH_CLIENT_ID!');
    throw new Error('Конфигурация сервера: отсутствует TWITCH_CLIENT_ID.');
  }
  if (!clientSecret) {
    console.error('[API /twitch/user] ОШИБКА: Отсутствует TWITCH_CLIENT_SECRET!');
    throw new Error('Конфигурация сервера: отсутствует TWITCH_CLIENT_SECRET.');
  }

  try {
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      cache: 'no-store' // Не кэшируем запрос токена
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API /twitch/user] Ошибка получения токена Twitch (${response.status}): ${errorText}`);
      if (response.status === 401 || response.status === 403) {
         throw new Error('Ошибка авторизации Twitch: Неверный Client ID/Secret.');
      } else {
          throw new Error(`Ошибка сервера Twitch при получении токена: ${response.status}`);
      }
    }
    const data = await response.json();
    if (!data.access_token) {
        console.error('[API /twitch/user] В ответе Twitch отсутствует access_token.', data);
        throw new Error('Ошибка ответа Twitch: отсутствует access_token.');
    }
    console.log('[API /twitch/user] Новый токен приложения Twitch успешно получен.');
    return data.access_token;
  } catch (error) {
    console.error('[API /twitch/user] Критическая ошибка при запросе токена Twitch:', error);
    // Перебрасываем ошибку, чтобы ее можно было поймать выше
    throw new Error(error.message || 'Неизвестная ошибка при получении токена Twitch.');
  }
}
// --- Конец функции ---

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const targetUserId = searchParams.get('userId'); 
  
  console.log(`[API /twitch/user] Запрос данных для userId: ${targetUserId}`);

  if (!targetUserId) {
    return NextResponse.json({ error: 'Отсутствует параметр userId' }, { status: 400 });
  }

  const cookieStore = cookies();
  const cachedDataKey = `twitch_user_${targetUserId}`; // Ключ для кэша в куках
  let response = null; // Переменная для хранения ответа (NextResponse)

  // Попытка вернуть свежий кэш из куки
  const cachedDataCookie = cookieStore.get(cachedDataKey)?.value;
  if (cachedDataCookie) {
    try {
      const parsedData = JSON.parse(cachedDataCookie);
      const cacheTime = parsedData?._cacheTime; // Используем внутреннее поле для времени кэширования
      // Если кэш свежий (меньше 10 минут), возвращаем его
      if (cacheTime && Date.now() - new Date(cacheTime).getTime() < 10 * 60 * 1000) { 
        console.log(`[API /twitch/user] Возвращаем СВЕЖИЕ данные из cookie для ${targetUserId}`);
        return NextResponse.json(parsedData);
      }
       console.log(`[API /twitch/user] Кэш в cookie для ${targetUserId} устарел.`);
    } catch (error) {
      console.error('[API /twitch/user] Ошибка парсинга кэша из cookie, удаляем его:', error);
       // Удаляем битую куку
       try {
           cookieStore.set(cachedDataKey, '', { maxAge: 0, path: '/' });
       } catch {/* игнор */} 
    }
  }

  // Если свежего кэша нет, идем в Twitch API
  try {
    const appAccessToken = await getTwitchAppAccessToken();
    const clientIdHeader = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;

    console.log(`[API /twitch/user] Запрос к Twitch API для ${targetUserId}...`);
    const twitchResponse = await fetch(`https://api.twitch.tv/helix/users?id=${targetUserId}`, {
      headers: {
        'Authorization': `Bearer ${appAccessToken}`,
        'Client-Id': clientIdHeader || '' 
      },
      cache: 'no-store' // Не кэшируем этот запрос
    });

    if (!twitchResponse.ok) {
      const errorText = await twitchResponse.text();
      const status = twitchResponse.status;
      console.error(`[API /twitch/user] Ошибка Twitch API (${status}) для ${targetUserId}: ${errorText}`);
      // При ошибке Twitch API возвращаем 502 Bad Gateway
      return NextResponse.json({ error: `Ошибка Twitch API: ${status}` }, { status: 502 }); 
    }

    // Успешный ответ от Twitch
    const twitchData = await twitchResponse.json();
    if (!twitchData.data || twitchData.data.length === 0) {
      console.warn(`[API /twitch/user] Пользователь ${targetUserId} не найден в Twitch API.`);
      return NextResponse.json({ error: 'Пользователь Twitch не найден' }, { status: 404 });
    }

    const userData = twitchData.data[0];
    // Добавляем временную метку кэширования
    userData._cacheTime = new Date().toISOString(); 

    // Создаем ответ и одновременно устанавливаем куку
    response = NextResponse.json(userData);
    try {
        response.cookies.set(cachedDataKey, JSON.stringify(userData), {
          maxAge: 10 * 60, // Кэш на 10 минут
          path: '/', 
          sameSite: 'lax', 
          httpOnly: true, // Делаем куку httpOnly для безопасности
          secure: process.env.NODE_ENV === 'production',
        });
        console.log(`[API /twitch/user] Свежие данные для ${targetUserId} сохранены в cookie.`);
    } catch (cookieError) {
         console.error(`[API /twitch/user] Ошибка сохранения кэша в cookie для ${targetUserId}:`, cookieError);
         // Если не удалось сохранить в куки, все равно возвращаем данные
    }

    console.log(`[API /twitch/user] Успешно получены данные для ${userData.display_name} (${targetUserId})`);
    return response;

  } catch (error) {
    // Эта ошибка может быть от getTwitchAppAccessToken или от fetch
    console.error('[API /twitch/user] Непредвиденная ошибка:', error);
    // Возвращаем 500 Internal Server Error
    return NextResponse.json({ error: error.message || 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic'; 