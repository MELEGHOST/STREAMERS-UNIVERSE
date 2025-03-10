// Импортируем наше имитационное хранилище данных
import { mockDb } from './mockDataStore';

// Экспортируем mockDb вместо prisma
export const prisma = mockDb;