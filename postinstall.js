const { execSync } = require('child_process');

try {
  console.log('Проверка зависимостей...');
  console.log('Используется Supabase, пропускаем генерацию Prisma...');
  
  // Выполним дополнительные проверки
  const hasSupabase = execSync('npm list @supabase/supabase-js || echo "not installed"').toString();
  if (hasSupabase.includes('not installed')) {
    console.log('Установка Supabase...');
    execSync('npm install @supabase/supabase-js');
  } else {
    console.log('Supabase уже установлен.');
  }
  
  console.log('Постустановка завершена успешно!');
} catch (error) {
  console.error('Ошибка в процессе постустановки:', error);
  // Не завершаем процесс с ошибкой, чтобы сборка продолжилась
  console.log('Продолжаем сборку несмотря на ошибки...');
} 