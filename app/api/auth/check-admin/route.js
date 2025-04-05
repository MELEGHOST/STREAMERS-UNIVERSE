import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(/* request */) {
  console.log('[API] /api/auth/check-admin: Начало проверки прав администратора.');
  
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value; },
        set(name, value, options) { cookieStore.set({ name, value, ...options }); },
        remove(name, options) { cookieStore.set({ name, value: '', ...options }); },
      },
    }
  );

  try {
    // 1. Получаем текущего пользователя
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.warn('[API] /api/auth/check-admin: Пользователь не авторизован или ошибка получения.', userError?.message);
      return NextResponse.json({ isAdmin: false, role: null, error: 'Не авторизован' }, { status: 401 });
    }

    console.log(`[API] /api/auth/check-admin: Проверка для пользователя ID: ${user.id}`);

    // 2. Проверяем права в таблице admin_users
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id) // Используем UUID пользователя из Supabase Auth
      .maybeSingle();

    if (adminError) {
      console.error('[API] /api/auth/check-admin: Ошибка запроса к admin_users:', adminError);
      return NextResponse.json({ isAdmin: false, role: null, error: `Ошибка базы данных: ${adminError.message}` }, { status: 500 });
    }

    // 3. Возвращаем результат
    if (adminData && adminData.role) {
      console.log(`[API] /api/auth/check-admin: Пользователь ${user.id} является админом, роль: ${adminData.role}`);
      return NextResponse.json({ isAdmin: true, role: adminData.role });
    } else {
      console.log(`[API] /api/auth/check-admin: Пользователь ${user.id} не является админом.`);
      return NextResponse.json({ isAdmin: false, role: null });
    }

  } catch (error) {
    console.error('[API] /api/auth/check-admin: Непредвиденная ошибка:', error);
    return NextResponse.json({ isAdmin: false, role: null, error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

// Указываем, что маршрут динамический
export const dynamic = 'force-dynamic'; 