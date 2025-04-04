import { execSync } from 'child_process';

// Функция для проверки и установки зависимостей
async function checkDependencies() {
  console.log('Проверка зависимостей...');
  
  try {
    // Проверяем установку Supabase
    const hasSupabase = execSync('npm list @supabase/supabase-js || echo "not installed"').toString();
    if (hasSupabase.includes('not installed')) {
      console.log('Установка Supabase...');
      execSync('npm install @supabase/supabase-js');
    } else {
      console.log('Supabase уже установлен.');
    }
    console.log('Проверка зависимостей завершена.');
  } catch (error) {
    console.error('Ошибка при проверке/установке зависимостей:', error);
    // Решаем, нужно ли прерывать сборку
    // throw error; // Раскомментируйте, если установка критична
  }
}

try {
  await checkDependencies(); // Проверяем зависимости
  console.log('Постустановка завершена успешно!');
} catch (error) {
  console.error('Ошибка в процессе постустановки:', error);
  // console.log('Продолжаем сборку несмотря на ошибки...'); 
  // Решаем, нужно ли прерывать сборку или продолжать
  // process.exit(1); // Прерываем сборку, если критично
} 