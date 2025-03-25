import { createClient } from '@supabase/supabase-js';

// Инициализация клиента Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Проверка наличия обязательных переменных окружения
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Ошибка: отсутствуют обязательные переменные окружения для Supabase');
  
  // В режиме production оставляем предупреждение, но позволяем приложению работать
  if (process.env.NODE_ENV === 'production') {
    console.warn('Supabase клиент не будет работать корректно из-за отсутствия переменных окружения');
  }
}

// Создание клиента Supabase только если есть все необходимые переменные окружения
const supabase = supabaseUrl && supabaseAnonKey ? 
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }) : 
  // Создаем прокси-объект, который выдает предупреждение при попытке использования
  new Proxy({}, {
    get: function(target, prop) {
      if (prop === 'from' || prop === 'auth' || prop === 'storage') {
        return new Proxy({}, {
          get: function() {
            console.error('Supabase клиент не инициализирован из-за отсутствия переменных окружения');
            return () => ({ data: null, error: new Error('Supabase не настроен') });
          }
        });
      }
      if (typeof target[prop] === 'function') {
        return () => {
          console.error('Supabase клиент не инициализирован из-за отсутствия переменных окружения');
          return Promise.resolve({ data: null, error: new Error('Supabase не настроен') });
        };
      }
      return target[prop];
    }
  });

// Функция для проверки существования таблицы
async function checkTableExists(tableName) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error(`Невозможно проверить таблицу ${tableName}: Supabase не настроен`);
      return false;
    }
    
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
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error(`Невозможно инициализировать таблицы: Supabase не настроен`);
      return;
    }
    
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

// Запускаем инициализацию таблиц только если Supabase настроен
if (typeof window === 'undefined' && supabaseUrl && supabaseAnonKey) {
  // Выполняем только на сервере при наличии переменных окружения
  initializeTables().catch(console.error);
}

export default supabase; 