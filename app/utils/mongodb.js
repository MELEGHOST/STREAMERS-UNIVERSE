import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/streamers-universe';
const MONGODB_DB = process.env.MONGODB_DB || 'streamers-universe';

// Кэшируем соединение с MongoDB
let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
  // Если у нас уже есть соединение, используем его
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  // Создаем новое соединение
  const client = new MongoClient(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  await client.connect();
  const db = client.db(MONGODB_DB);

  // Кэшируем соединение
  cachedClient = client;
  cachedDb = db;

  return { client, db };
} 