import { createClient } from '@supabase/supabase-js';

// Инициализация клиента Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Проверка наличия обязательных переменных окружения
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Ошибка: отсутствуют обязательные переменные окружения для Supabase');
}

// Создание клиента Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Функция для проверки существования таблицы
async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .rpc('table_exists', { table_name: tableName });
    
    if (error) {
      console.error(`Ошибка при проверке таблицы ${tableName}:`, error);
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.error(`Ошибка при проверке таблицы ${tableName}:`, error);
    return false;
  }
}

// Функция для инициализации таблиц
async function initializeTables() {
  try {
    // Проверяем существование таблицы users
    const usersTableExists = await checkTableExists('users');
    
    if (!usersTableExists) {
      console.log('Таблица users не существует, пытаемся инициализировать...');
      
      // Вызываем хранимую процедуру для создания таблиц
      const { error: createTablesError } = await supabase.rpc('create_tables');
      
      if (createTablesError) {
        console.error('Ошибка при создании таблиц:', createTablesError);
      } else {
        console.log('Таблицы успешно созданы');
      }
    } else {
      console.log('Таблица users существует');
    }
  } catch (error) {
    console.error('Ошибка при инициализации таблиц:', error);
  }
}

// Запускаем инициализацию таблиц
if (typeof window === 'undefined') {
  // Выполняем только на сервере
  initializeTables().catch(console.error);
}

export default supabase; 