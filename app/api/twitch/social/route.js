import { NextResponse } from 'next/server';
import supabase from '@/lib/supabaseClient'; // Убедитесь, что путь к клиенту Supabase правильный
import { cookies } from 'next/headers';

// Валидация URL (опционально)
function isValidUrl(url) {
  if (!url || url.trim() === '') return true; // Пустая строка считается валидной (нет ссылки)
  
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch (error) {
    return false;
  }
}

// Проверяем переданные ссылки на валидность
function validateLinks(links) {
  const fields = ['twitch', 'youtube', 'discord', 'telegram', 'vk', 'yandexMusic'];
  const invalidLinks = [];
  
  fields.forEach(field => {
    if (links[field] && !isValidUrl(links[field])) {
      invalidLinks.push(field);
    }
  });
  
  return invalidLinks;
}

/**
 * GET /api/twitch/social - получить социальные ссылки пользователя
 */
export async function GET(request) {
  try {
    // Получаем userId из параметров запроса
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Отсутствует userId' },
        { status: 400 }
      );
    }
    
    // Получаем социальные ссылки из базы данных
    const { data, error } = await supabase
      .from('social_links')
      .select('*') // Предполагается, что у нас есть все нужные колонки
      .eq('user_id', userId)
      .single(); // Ожидаем одну запись
    
    if (error) {
      // Если запись не найдена, это нормально, просто вернем пустые данные
      if (error.code === 'PGRST116') { // "Результат не содержит записей"
        return NextResponse.json({
          description: '',
          twitch: '',
          youtube: '',
          discord: '',
          telegram: '',
          vk: '',
          yandexMusic: '',
          isMusician: false
        });
      }
      
      // Если другая ошибка, логируем и возвращаем 500
      // console.error('Ошибка при получении социальных ссылок из Supabase:', error); // error не используется
      return NextResponse.json(
        { error: 'Ошибка при получении данных из базы данных' },
        { status: 500 }
      );
    }
    
    // Если данные найдены, приводим их к нужному формату
    return NextResponse.json({
      description: data.description || '',
      twitch: data.twitch || '',
      youtube: data.youtube || '',
      discord: data.discord || '',
      telegram: data.telegram || '',
      vk: data.vk || '',
      yandexMusic: data.yandex_music || '', // Предполагается, что в БД snake_case
      isMusician: data.is_musician || false // Предполагается, что в БД snake_case
    });
  } catch (error) {
    console.error('Ошибка при получении социальных ссылок:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/twitch/social - сохранить социальные ссылки пользователя
 */
export async function POST(request) {
  try {
    // Получаем данные из тела запроса
    const body = await request.json();
    const { userId } = body;
    
    // Проверяем, что userId передан
    if (!userId) {
      return NextResponse.json(
        { error: 'Отсутствует userId' },
        { status: 400 }
      );
    }
    
    // Проверяем авторизацию (опционально - если только авторизованные пользователи могут обновлять свои ссылки)
    const cookieStore = cookies();
    const userCookie = cookieStore.get('twitch_user')?.value;
    
    if (!userCookie) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }
    
    let currentUser;
    try {
      currentUser = JSON.parse(userCookie);
    } catch (error) {
      console.error('Ошибка при парсинге cookie:', error);
      return NextResponse.json(
        { error: 'Ошибка авторизации' },
        { status: 401 }
      );
    }
    
    // Проверяем, что пользователь обновляет свои собственные ссылки
    if (String(currentUser.id) !== String(userId)) {
      return NextResponse.json(
        { error: 'Вы можете обновлять только свои ссылки' },
        { status: 403 }
      );
    }
    
    // Валидируем ссылки, если они переданы
    const links = body.links || {};
    const invalidLinks = validateLinks(links);
    
    if (invalidLinks.length > 0) {
      return NextResponse.json(
        { 
          error: 'Некорректные ссылки', 
          invalidLinks: invalidLinks 
        },
        { status: 400 }
      );
    }
    
    // Подготавливаем данные для вставки/обновления
    const socialData = {
      user_id: userId,
      description: links.description || '',
      twitch: links.twitch || '',
      youtube: links.youtube || '',
      discord: links.discord || '',
      telegram: links.telegram || '',
      vk: links.vk || '',
      yandex_music: links.yandexMusic || '', // Предполагается, что в БД snake_case
      is_musician: links.isMusician || false, // Предполагается, что в БД snake_case
      updated_at: new Date().toISOString()
    };
    
    // Проверяем, существует ли запись для этого пользователя
    // const { data: existingData, error: checkError } = await supabase // existingData не используется
    const { error: checkError } = await supabase
      .from('social_links')
      .select('user_id')
      .eq('user_id', userId)
      .single();
    
    let dbOperation;
    if (checkError && checkError.code === 'PGRST116') {
      // Запись не найдена, создаем новую
      socialData.created_at = new Date().toISOString();
      dbOperation = supabase
        .from('social_links')
        .insert([socialData]);
    } else {
      // Запись существует, обновляем
      dbOperation = supabase
        .from('social_links')
        .update(socialData)
        .eq('user_id', userId);
    }
    
    // Выполняем операцию вставки/обновления
    const { error: saveError } = await dbOperation;
    
    if (saveError) {
      console.error('Ошибка при сохранении социальных ссылок в Supabase:', saveError);
      return NextResponse.json(
        { error: 'Ошибка при сохранении данных в базу данных' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Социальные ссылки успешно сохранены'
    });
  } catch (error) {
    console.error('Ошибка при сохранении социальных ссылок:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
} 