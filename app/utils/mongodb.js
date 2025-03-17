import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/streamers-universe';
const MONGODB_DB = process.env.MONGODB_DB || 'streamers-universe';

// Кэшируем соединение с MongoDB
let cachedClient = null;
let cachedDb = null;

// Максимальное количество попыток подключения
const MAX_RETRIES = 3;
// Задержка между попытками (в миллисекундах)
const RETRY_DELAY = 1000;

/**
 * Подключается к базе данных MongoDB с повторными попытками
 * @returns {Promise<{client: MongoClient, db: Db}>} - Клиент и база данных MongoDB
 */
export async function connectToDatabase() {
  // Если у нас уже есть соединение, используем его
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  let lastError = null;
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      // Создаем новое соединение
      const client = new MongoClient(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        connectTimeoutMS: 10000, // 10 секунд таймаут на подключение
        socketTimeoutMS: 45000, // 45 секунд таймаут на операции
      });

      console.log(`Попытка подключения к MongoDB (${retries + 1}/${MAX_RETRIES})...`);
      await client.connect();
      
      // Проверяем соединение
      await client.db(MONGODB_DB).command({ ping: 1 });
      console.log('Успешное подключение к MongoDB');
      
      const db = client.db(MONGODB_DB);

      // Кэшируем соединение
      cachedClient = client;
      cachedDb = db;

      return { client, db };
    } catch (error) {
      lastError = error;
      console.error(`Ошибка подключения к MongoDB (попытка ${retries + 1}/${MAX_RETRIES}):`, error.message);
      
      // Увеличиваем счетчик попыток
      retries++;
      
      // Если это не последняя попытка, ждем перед следующей
      if (retries < MAX_RETRIES) {
        console.log(`Повторная попытка через ${RETRY_DELAY}мс...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  // Если все попытки не удались, выбрасываем ошибку
  console.error('Не удалось подключиться к MongoDB после нескольких попыток');
  throw lastError || new Error('Не удалось подключиться к MongoDB');
}

/**
 * Закрывает соединение с MongoDB
 */
export async function closeMongoDBConnection() {
  if (cachedClient) {
    try {
      await cachedClient.close();
      cachedClient = null;
      cachedDb = null;
      console.log('Соединение с MongoDB закрыто');
    } catch (error) {
      console.error('Ошибка при закрытии соединения с MongoDB:', error);
    }
  }
} 