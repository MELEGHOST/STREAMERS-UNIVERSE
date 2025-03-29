import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Вспомогательная функция для создания серверного клиента Supabase
// Убедитесь, что переменные окружения NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY (или SUPABASE_ANON_KEY) установлены в Vercel
const createSupabaseServerClient = () => {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY, // Используем сервисный ключ для безопасных операций на сервере
    // process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, // Или ANON ключ, если RLS настроен для него
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
};

// GET-обработчик: получение данных профиля
export async function GET(request) {
  const supabase = createSupabaseServerClient();

  try {
    // Получаем сессию пользователя (и ID)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('GET /api/user-profile-data: Auth error or no user', authError);
      return NextResponse.json({ error: 'Необходима аутентификация' }, { status: 401 });
    }

    const userId = user.id;
    console.log(`GET /api/user-profile-data: Fetching profile for user ${userId}`);

    // Запрашиваем профиль из таблицы user_profiles
    const { data: profileData, error: dbError } = await supabase
      .from('user_profiles')
      .select('description, birthday, show_birthday, social_links, stats_visibility')
      .eq('user_id', userId)
      .maybeSingle(); // Возвращает null, если запись не найдена, вместо ошибки

    if (dbError) {
      console.error(`GET /api/user-profile-data: DB error for user ${userId}`, dbError);
      throw dbError; // Передаем ошибку дальше для обработки
    }

    console.log(`GET /api/user-profile-data: Profile data for user ${userId}`, profileData);

    // Возвращаем найденные данные или пустой объект/дефолтные значения, если профиля еще нет
    const responseData = profileData || {
        description: '',
        birthday: null, // Используем null для отсутствующей даты
        show_birthday: true,
        social_links: {}, // Пустой объект для ссылок
        stats_visibility: { // Значения по умолчанию, как в SQL
            followers: true,
            followings: true,
            streams: true,
            channel: true,
            accountInfo: true
        }
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('GET /api/user-profile-data: Internal server error', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера при получении профиля' }, { status: 500 });
  }
}

// POST-обработчик: сохранение данных профиля
export async function POST(request) {
  const supabase = createSupabaseServerClient();

  try {
    // Получаем сессию пользователя (и ID)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('POST /api/user-profile-data: Auth error or no user', authError);
      return NextResponse.json({ error: 'Необходима аутентификация' }, { status: 401 });
    }

    const userId = user.id;
    console.log(`POST /api/user-profile-data: Saving profile for user ${userId}`);

    // Получаем данные из тела запроса
    let requestData;
    try {
        requestData = await request.json();
    } catch (parseError) {
        console.error('POST /api/user-profile-data: Invalid JSON body', parseError);
        return NextResponse.json({ error: 'Некорректный формат данных запроса (JSON)' }, { status: 400 });
    }


    // Валидация и подготовка данных для сохранения
    const {
      description,
      birthday,
      showBirthday,
      twitch, youtube, discord, telegram, vk, yandexMusic, isMusician, // Разбираем соцсети
      statsVisibility
    } = requestData;

    // 1. Описание
    const validatedDescription = typeof description === 'string' ? description.trim().slice(0, 500) : '';

    // 2. День рождения
    let validatedBirthday = null;
    if (birthday && typeof birthday === 'string') {
        try {
            const date = new Date(birthday);
            // Проверяем, что дата валидна и не является "Invalid Date"
            if (!isNaN(date.getTime())) {
                // Форматируем в YYYY-MM-DD для PostgreSQL
                 validatedBirthday = date.toISOString().split('T')[0];
            } else {
                 console.warn(`POST /api/user-profile-data: Invalid birthday format for user ${userId}: ${birthday}`);
                 // Можно вернуть ошибку или просто проигнорировать невалидную дату
                 // return NextResponse.json({ error: 'Неверный формат даты рождения' }, { status: 400 });
            }
        } catch(dateError) {
             console.warn(`POST /api/user-profile-data: Error parsing birthday for user ${userId}: ${birthday}`, dateError);
        }
    }

    // 3. Показывать день рождения
    const validatedShowBirthday = typeof showBirthday === 'boolean' ? showBirthday : true;

    // 4. Социальные ссылки (простая валидация на строку)
    const validatedSocialLinks = {
        twitch: typeof twitch === 'string' ? twitch.trim() : '',
        youtube: typeof youtube === 'string' ? youtube.trim() : '',
        discord: typeof discord === 'string' ? discord.trim() : '',
        telegram: typeof telegram === 'string' ? telegram.trim() : '',
        vk: typeof vk === 'string' ? vk.trim() : '',
        yandexMusic: typeof yandexMusic === 'string' ? yandexMusic.trim() : '',
        isMusician: typeof isMusician === 'boolean' ? isMusician : false,
    };

    // 5. Настройки видимости (проверяем, что это объект и значения булевы)
    const defaultVisibility = { followers: true, followings: true, streams: true, channel: true, accountInfo: true };
    let validatedStatsVisibility = { ...defaultVisibility }; // Начинаем с дефолтных
    if (statsVisibility && typeof statsVisibility === 'object') {
        for (const key in defaultVisibility) {
            if (typeof statsVisibility[key] === 'boolean') {
                validatedStatsVisibility[key] = statsVisibility[key];
            }
        }
    }

    // Данные для вставки/обновления
    const profileToUpsert = {
      user_id: userId, // Обязательно для upsert
      description: validatedDescription,
      birthday: validatedBirthday,
      show_birthday: validatedShowBirthday,
      social_links: validatedSocialLinks,
      stats_visibility: validatedStatsVisibility,
      // updated_at обновится автоматически триггером
    };

    console.log(`POST /api/user-profile-data: Upserting data for user ${userId}:`, profileToUpsert);

    // Используем upsert для вставки или обновления записи
    const { error: upsertError } = await supabase
      .from('user_profiles')
      .upsert(profileToUpsert, { onConflict: 'user_id' }); // Указываем столбец для проверки конфликта

    if (upsertError) {
      console.error(`POST /api/user-profile-data: Upsert error for user ${userId}`, upsertError);
      // Проверяем специфичные ошибки БД, если нужно
      if (upsertError.code === '23503') { // foreign_key_violation (маловероятно здесь, но возможно)
           return NextResponse.json({ error: 'Ошибка связи с пользователем' }, { status: 400 });
      }
      if (upsertError.code === '23514') { // check_violation (например, длина описания)
           return NextResponse.json({ error: 'Данные не прошли проверку (например, слишком длинное описание)' }, { status: 400 });
      }
      throw upsertError; // Передаем дальше для общей обработки
    }

    console.log(`POST /api/user-profile-data: Profile saved successfully for user ${userId}`);
    return NextResponse.json({ message: 'Профиль успешно сохранен' });

  } catch (error) {
    console.error('POST /api/user-profile-data: Internal server error', error);
    // Избегаем отправки деталей внутренней ошибки клиенту
    return NextResponse.json({ error: 'Внутренняя ошибка сервера при сохранении профиля' }, { status: 500 });
  }
} 