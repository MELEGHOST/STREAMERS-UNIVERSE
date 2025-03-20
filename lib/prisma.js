// Импортируем наше имитационное хранилище данных
import { mockDb } from '../app/utils/mockDataStore';

// Экспортируем mockDb вместо настоящего prisma
const prisma = mockDb;

export default prisma; 