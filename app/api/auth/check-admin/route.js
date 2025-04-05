import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Используем SERVICE KEY для админских проверок

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[API /check-admin] ОШИБКА: Отсутствуют URL/Service Key Supabase.');
    return NextResponse.json({ error: 'Ошибка конфигурации сервера' }, { status: 500 });
  }

  // Создаем серверный клиент Supabase с SERVICE KEY
  // Провайдер кук здесь не так важен, так как мы проверяем пользователя по сессии, полученной ранее,
  // но для единообразия создадим его
  const supabase = createServerClient(
    supabaseUrl,
    supabaseServiceKey, // ВАЖНО: Используем SERVICE KEY!
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        // set/remove не нужны, так как service key не устанавливает сессию
      },
      // Отключаем авто-обновление токена для сервисного ключа
      auth: {
         autoRefreshToken: false,
         persistSession: false,
      }
    }
  );

  // Получаем пользователя из сессии (установленной ранее через ANON KEY)
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.warn('[API /check-admin] Пользователь не аутентифицирован или ошибка:', authError?.message);
    return NextResponse.json({ isAdmin: false, role: null, error: 'Пользователь не аутентифицирован' }, { status: 401 });
  }

  console.log(`[API /check-admin] Проверка админ-прав для пользователя: ${user.id}`);

  try {
    // Ищем пользователя в таблице admin_users
    const { data: adminData, error: dbError } = await supabase
      .from('admin_users')
      .select('role') // Выбираем только роль
      .eq('user_id', user.id)
      .maybeSingle(); // Ожидаем одного или ноль результатов

    if (dbError) {
      console.error('[API /check-admin] Ошибка запроса к admin_users:', dbError);
      return NextResponse.json({ error: 'Ошибка базы данных при проверке прав' }, { status: 500 });
    }

    if (adminData) {
      // Пользователь найден в таблице админов
      console.log(`[API /check-admin] Пользователь ${user.id} является админом. Роль: ${adminData.role}`);
      return NextResponse.json({ isAdmin: true, role: adminData.role });
    } else {
      // Пользователь не найден
      console.log(`[API /check-admin] Пользователь ${user.id} НЕ является админом.`);
      return NextResponse.json({ isAdmin: false, role: null });
    }

  } catch (error) {
    console.error('[API /check-admin] Непредвиденная ошибка:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic'; 