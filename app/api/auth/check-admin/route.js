import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[API /check-admin] ОШИБКА: Отсутствуют переменные окружения Supabase.');
    return NextResponse.json({ error: 'Ошибка конфигурации сервера' }, { status: 500 });
  }
  
  const authHeader = request.headers.get('Authorization');
  const jwt = authHeader?.split(' ')[1];

  if (!jwt) {
    return NextResponse.json({ error: 'Отсутствует токен авторизации' }, { status: 401 });
  }

  // Создаем стандартный клиент с SERVICE KEY
  const supabaseAdmin = createClient(
      supabaseUrl, 
      supabaseServiceKey,
      {
        auth: {
           autoRefreshToken: false,
           persistSession: false,
        }
      }
  );

  // 1. Получаем пользователя по JWT
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);

  if (authError || !user) {
    console.warn('[API /check-admin] Пользователь не аутентифицирован или ошибка по токену:', authError?.message);
    return NextResponse.json({ isAdmin: false, role: null, error: 'Пользователь не аутентифицирован' }, { status: 401 });
  }

  console.log(`[API /check-admin] Проверка роли для пользователя: ${user.id}`);

  try {
    // 2. ИЩЕМ РОЛЬ В ТАБЛИЦЕ 'profiles'
    const { data: profileData, error: dbError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (dbError) {
      console.error('[API /check-admin] Ошибка запроса к profiles:', dbError);
      // Если профиля еще нет, это не ошибка. Просто у юзера нет роли.
      if (dbError.code === 'PGRST116') { // 'single() row not found'
          console.log(`[API /check-admin] Профиль для пользователя ${user.id} еще не создан.`);
          return NextResponse.json({ isAdmin: false, role: 'user' });
      }
      return NextResponse.json({ error: 'Ошибка базы данных при проверке роли' }, { status: 500 });
    }
    
    const userRole = profileData?.role || 'user';
    const isAdmin = userRole === 'admin' || userRole === 'admin/streamer';

    console.log(`[API /check-admin] Роль пользователя из profiles: ${userRole}. Является админом: ${isAdmin}`);
    
    return NextResponse.json({ isAdmin, role: userRole });

  } catch (error) {
    console.error('[API /check-admin] Непредвиденная ошибка:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic'; 