import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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

  // Создаем клиент с SERVICE KEY для запроса с правами админа
  const supabaseAdmin = createServerClient(
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

  console.log(`[API /check-admin] Проверка админ-прав для пользователя: ${user.id}`);

  try {
    // 2. Используем админ-клиент для запроса к таблице 'admin_users'
    const { data: adminData, error: dbError } = await supabaseAdmin
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (dbError) {
      console.error('[API /check-admin] Ошибка запроса к admin_users:', dbError);
      return NextResponse.json({ error: 'Ошибка базы данных при проверке прав' }, { status: 500 });
    }

    if (adminData) {
      console.log(`[API /check-admin] Пользователь ${user.id} является админом. Роль: ${adminData.role}`);
      return NextResponse.json({ isAdmin: true, role: adminData.role });
    } else {
      console.log(`[API /check-admin] Пользователь ${user.id} НЕ является админом.`);
      return NextResponse.json({ isAdmin: false, role: 'user' });
    }

  } catch (error) {
    console.error('[API /check-admin] Непредвиденная ошибка:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic'; 